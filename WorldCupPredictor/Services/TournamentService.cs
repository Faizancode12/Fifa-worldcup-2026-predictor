using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Data;
using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;

namespace WorldCupPredictor.Services
{
    /// <summary>
    /// Orchestrates the full 48-team -> 32 -> 16 -> 8 -> 4 -> 2 -> 1 simulation,
    /// delegating every individual match outcome to <see cref="IPredictionEngine"/>.
    /// </summary>
    public class TournamentService : ITournamentService
    {
        private readonly AppDbContext _db;
        private readonly IPredictionEngine _engine;

        private static readonly string[] GroupNames =
            { "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L" };

        public TournamentService(AppDbContext db, IPredictionEngine engine)
        {
            _db = db;
            _engine = engine;
        }

        public async Task<TournamentResultDTO> SimulateFullTournamentAsync()
        {
            // Fresh run every time - no stale/hardcoded results carried over.
            _db.Predictions.RemoveRange(_db.Predictions);
            _db.Matches.RemoveRange(_db.Matches);
            await _db.SaveChangesAsync();

            var allTeams = await _db.Teams.AsNoTracking().ToListAsync();

            // ----- STEP 1: GROUP STAGE (48 -> 32) -----
            var qualifiers = new List<Team>(); // top 2 from each group
            var thirdPlaceCandidates = new List<GroupStandingRow>();

            foreach (var groupName in GroupNames)
            {
                var groupTeams = allTeams.Where(t => t.Group == groupName).ToList();
                var standings = await PlayGroupRoundRobinAsync(groupTeams, groupName);

                qualifiers.Add(allTeams.First(t => t.Id == standings[0].TeamId));
                qualifiers.Add(allTeams.First(t => t.Id == standings[1].TeamId));
                thirdPlaceCandidates.Add(standings[2]);
            }

            var bestThirds = thirdPlaceCandidates
                .OrderByDescending(s => s.Points)
                .ThenByDescending(s => s.GoalDifference)
                .ThenByDescending(s => s.GoalsFor)
                .Take(8)
                .Select(s => allTeams.First(t => t.Id == s.TeamId))
                .ToList();

            var round32Field = qualifiers.Concat(bestThirds).ToList(); // 32 teams

            // ----- STEP 2: KNOCKOUT STAGES -----
            var seededField = SeedBracket(round32Field);

            var r32Winners = await PlayKnockoutRoundAsync(seededField, TournamentStage.RoundOf32);
            var r16Winners = await PlayKnockoutRoundAsync(r32Winners, TournamentStage.RoundOf16);
            var qfWinners = await PlayKnockoutRoundAsync(r16Winners, TournamentStage.QuarterFinal);
            var sfWinners = await PlayKnockoutRoundAsync(qfWinners, TournamentStage.SemiFinal);
            var finalResult = await PlayKnockoutRoundAsync(sfWinners, TournamentStage.Final);

            var champion = finalResult[0];

            // Runner-up = the loser of the Final match.
            var finalMatch = await _db.Matches
                .Where(m => m.Stage == TournamentStage.Final)
                .OrderByDescending(m => m.Id)
                .FirstAsync();
            int runnerUpId = finalMatch.WinnerTeamId == finalMatch.TeamAId ? finalMatch.TeamBId : finalMatch.TeamAId;
            var runnerUp = allTeams.First(t => t.Id == runnerUpId);

            var allMatches = await GetBracketAsync();
            var groupMatches = await GetGroupMatchesAsDtoAsync();

            return new TournamentResultDTO
            {
                ChampionTeamId = champion.Id,
                ChampionTeamName = champion.Name,
                RunnerUpTeamId = runnerUp.Id,
                RunnerUpTeamName = runnerUp.Name,
                AllMatches = groupMatches.Concat(allMatches).ToList()
            };
        }

        public async Task<List<GroupTable>> GetStandingsAsync(string? group)
        {
            var groupsToProcess = string.IsNullOrWhiteSpace(group)
                ? GroupNames
                : new[] { group.Trim().ToUpperInvariant() };

            var result = new List<GroupTable>();

            foreach (var g in groupsToProcess)
            {
                var teams = await _db.Teams.AsNoTracking().Where(t => t.Group == g).ToListAsync();
                if (teams.Count == 0) continue;

                var matches = await _db.Matches.AsNoTracking()
                    .Where(m => m.Stage == TournamentStage.Group && m.GroupName == g && m.IsPlayed)
                    .ToListAsync();

                var rows = BuildStandingsFromMatches(teams, matches);

                result.Add(new GroupTable { GroupName = g, Standings = rows });
            }

            return result;
        }

        public async Task<List<MatchDTO>> GetBracketAsync()
        {
            var matches = await _db.Matches.AsNoTracking()
                .Include(m => m.TeamA)
                .Include(m => m.TeamB)
                .Where(m => m.Stage != TournamentStage.Group)
                .OrderBy(m => m.Stage)
                .ThenBy(m => m.Id)
                .ToListAsync();

            return matches.Select(ToDto).ToList();
        }

        // ============================================================
        // Internal helpers
        // ============================================================

        private async Task<List<GroupStandingRow>> PlayGroupRoundRobinAsync(List<Team> groupTeams, string groupName)
        {
            // Round robin: every team plays every other team once (6 matches for 4 teams).
            for (int i = 0; i < groupTeams.Count; i++)
            {
                for (int j = i + 1; j < groupTeams.Count; j++)
                {
                    await SimulateAndPersistMatchAsync(groupTeams[i], groupTeams[j], TournamentStage.Group, groupName, allowDraw: true);
                }
            }

            var playedMatches = await _db.Matches
                .Where(m => m.Stage == TournamentStage.Group && m.GroupName == groupName)
                .ToListAsync();

            return BuildStandingsFromMatches(groupTeams, playedMatches);
        }

        private List<GroupStandingRow> BuildStandingsFromMatches(List<Team> teams, List<Match> matches)
        {
            var rows = teams.ToDictionary(t => t.Id, t => new GroupStandingRow
            {
                TeamId = t.Id,
                TeamName = t.Name,
                Group = t.Group
            });

            foreach (var m in matches)
            {
                if (!rows.ContainsKey(m.TeamAId) || !rows.ContainsKey(m.TeamBId)) continue;

                var rowA = rows[m.TeamAId];
                var rowB = rows[m.TeamBId];

                rowA.Played++; rowB.Played++;
                rowA.GoalsFor += m.TeamAScore; rowA.GoalsAgainst += m.TeamBScore;
                rowB.GoalsFor += m.TeamBScore; rowB.GoalsAgainst += m.TeamAScore;

                if (m.TeamAScore > m.TeamBScore)
                {
                    rowA.Wins++; rowA.Points += 2;
                    rowB.Losses++;
                }
                else if (m.TeamBScore > m.TeamAScore)
                {
                    rowB.Wins++; rowB.Points += 2;
                    rowA.Losses++;
                }
                else
                {
                    rowA.Draws++; rowA.Points += 1;
                    rowB.Draws++; rowB.Points += 1;
                }
            }

            return rows.Values
                .OrderByDescending(r => r.Points)
                .ThenByDescending(r => r.GoalDifference)
                .ThenByDescending(r => r.GoalsFor)
                .ToList();
        }

        /// <summary>
        /// Plays one knockout round for an ordered list of teams (bracket slot order:
        /// index 0 plays index 1, index 2 plays index 3, etc.) and returns the winners
        /// in the same relative bracket order, ready for the next round.
        /// </summary>
        private async Task<List<Team>> PlayKnockoutRoundAsync(List<Team> orderedTeams, TournamentStage stage)
        {
            var winners = new List<Team>();

            for (int i = 0; i < orderedTeams.Count; i += 2)
            {
                var teamA = orderedTeams[i];
                var teamB = orderedTeams[i + 1];

                var match = await SimulateAndPersistMatchAsync(teamA, teamB, stage, null, allowDraw: false);
                var winnerId = match.WinnerTeamId!.Value;
                winners.Add(winnerId == teamA.Id ? teamA : teamB);
            }

            return winners;
        }

        private async Task<Match> SimulateAndPersistMatchAsync(Team teamA, Team teamB, TournamentStage stage, string? groupName, bool allowDraw)
        {
            var prediction = _engine.PredictMatch(teamA, teamB, allowDraw);

            var match = new Match
            {
                TeamAId = teamA.Id,
                TeamBId = teamB.Id,
                TeamAScore = prediction.PredictedScoreA,
                TeamBScore = prediction.PredictedScoreB,
                Stage = stage,
                GroupName = groupName,
                IsPlayed = true,
                WinnerTeamId = prediction.PredictedWinnerId,
                DecidedByPenalties = prediction.DecidedByPenalties,
                SimulatedAtUtc = DateTime.UtcNow
            };

            _db.Matches.Add(match);
            await _db.SaveChangesAsync(); // need match.Id for the prediction FK

            _db.Predictions.Add(new PredictionResult
            {
                MatchId = match.Id,
                PredictedWinner = prediction.PredictedWinnerId,
                WinProbabilityA = prediction.WinProbabilityA,
                WinProbabilityB = prediction.WinProbabilityB,
                DrawProbability = prediction.DrawProbability,
                AiScoreA = prediction.AiScoreA,
                AiScoreB = prediction.AiScoreB,
                CreatedAtUtc = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return match;
        }

        /// <summary>
        /// Orders the 32 qualified teams into standard single-elimination bracket
        /// slots (seed 1 vs seed 32, seed 2 vs seed 31, ...) so the strongest teams
        /// by AI score are spread apart, avoiding early heavyweight collisions.
        /// </summary>
        private List<Team> SeedBracket(List<Team> teams)
        {
            var seeded = teams
                .OrderByDescending(t => _engine.CalculateAiScore(t))
                .ToList();

            var seedOrder = GenerateSeedOrder(seeded.Count); // 1-indexed seed positions
            return seedOrder.Select(seedNumber => seeded[seedNumber - 1]).ToList();
        }

        /// <summary>
        /// Standard recursive bracket-seeding algorithm (e.g. for 8: 1,8,4,5,2,7,3,6).
        /// </summary>
        private static List<int> GenerateSeedOrder(int size)
        {
            var seeds = new List<int> { 1, 2 };
            while (seeds.Count < size)
            {
                int sum = seeds.Count * 2 + 1;
                var next = new List<int>();
                foreach (var s in seeds)
                {
                    next.Add(s);
                    next.Add(sum - s);
                }
                seeds = next;
            }
            return seeds;
        }

        private async Task<List<MatchDTO>> GetGroupMatchesAsDtoAsync()
        {
            var matches = await _db.Matches.AsNoTracking()
                .Include(m => m.TeamA)
                .Include(m => m.TeamB)
                .Where(m => m.Stage == TournamentStage.Group)
                .OrderBy(m => m.GroupName)
                .ThenBy(m => m.Id)
                .ToListAsync();

            return matches.Select(ToDto).ToList();
        }

        private static MatchDTO ToDto(Match m) => new()
        {
            Id = m.Id,
            TeamAId = m.TeamAId,
            TeamAName = m.TeamA?.Name ?? string.Empty,
            TeamBId = m.TeamBId,
            TeamBName = m.TeamB?.Name ?? string.Empty,
            TeamAScore = m.TeamAScore,
            TeamBScore = m.TeamBScore,
            Stage = m.Stage.ToString(),
            GroupName = m.GroupName,
            IsPlayed = m.IsPlayed,
            WinnerTeamId = m.WinnerTeamId,
            DecidedByPenalties = m.DecidedByPenalties
        };
    }
}
