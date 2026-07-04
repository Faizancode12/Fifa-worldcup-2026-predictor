using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Data;
using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api/matches")]
    public class MatchesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public MatchesController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>GET /api/matches - all matches, optionally filtered by stage and/or group.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MatchDTO>>> GetAll([FromQuery] TournamentStage? stage, [FromQuery] string? group)
        {
            var query = _db.Matches.AsNoTracking()
                .Include(m => m.TeamA)
                .Include(m => m.TeamB)
                .AsQueryable();

            if (stage.HasValue) query = query.Where(m => m.Stage == stage.Value);
            if (!string.IsNullOrWhiteSpace(group)) query = query.Where(m => m.GroupName == group.Trim().ToUpperInvariant());

            var matches = await query.OrderBy(m => m.Stage).ThenBy(m => m.Id).ToListAsync();
            return Ok(matches.Select(ToDto));
        }

        /// <summary>GET /api/matches/{id}</summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<MatchDTO>> GetById(int id)
        {
            var match = await _db.Matches.AsNoTracking()
                .Include(m => m.TeamA)
                .Include(m => m.TeamB)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (match == null) return NotFound(new { message = $"Match {id} not found." });
            return Ok(ToDto(match));
        }

        /// <summary>POST /api/matches - manually schedules a match (not yet played/predicted).</summary>
        [HttpPost]
        public async Task<ActionResult<MatchDTO>> Create([FromBody] CreateMatchDTO dto)
        {
            var teamA = await _db.Teams.FindAsync(dto.TeamAId);
            var teamB = await _db.Teams.FindAsync(dto.TeamBId);

            if (teamA == null || teamB == null)
                return BadRequest(new { message = "Both TeamAId and TeamBId must reference existing teams." });

            var match = new Match
            {
                TeamAId = dto.TeamAId,
                TeamBId = dto.TeamBId,
                Stage = dto.Stage,
                GroupName = dto.GroupName,
                IsPlayed = false
            };

            _db.Matches.Add(match);
            await _db.SaveChangesAsync();

            match.TeamA = teamA;
            match.TeamB = teamB;

            return CreatedAtAction(nameof(GetById), new { id = match.Id }, ToDto(match));
        }

        /// <summary>
        /// PUT /api/matches/{id}/result - records the real result for a match and grades
        /// every user's stored prediction for it (feeds the real leaderboard/points).
        /// </summary>
        [HttpPut("{id:int}/result")]
        public async Task<ActionResult<MatchDTO>> SetResult(int id, [FromBody] SetMatchResultDTO dto)
        {
            var match = await _db.Matches.Include(m => m.TeamA).Include(m => m.TeamB)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (match == null) return NotFound(new { message = $"Match {id} not found." });

            match.TeamAScore = dto.TeamAScore;
            match.TeamBScore = dto.TeamBScore;
            match.IsPlayed = true;
            match.DecidedByPenalties = dto.DecidedByPenalties;
            match.WinnerTeamId = dto.TeamAScore == dto.TeamBScore && !dto.DecidedByPenalties
                ? null
                : (dto.WinnerTeamId ?? (dto.TeamAScore > dto.TeamBScore ? match.TeamAId : match.TeamBId));

            await GradeUserPredictionsAsync(match);
            await _db.SaveChangesAsync();

            return Ok(ToDto(match));
        }

        /// <summary>Grades every stored UserPrediction for a now-decided match: +100pts for the
        /// correct winner (or correct draw call). Kept consistent with the 100pt scoring used
        /// when picks are graded against the AI's own prediction in UserPredictionsController.</summary>
        private async Task GradeUserPredictionsAsync(Match match)
        {
            var predictions = await _db.UserPredictions.Where(p => p.MatchId == match.Id).ToListAsync();
            foreach (var p in predictions)
            {
                var correctWinner = match.WinnerTeamId == null
                    ? p.PredictedWinnerId == null
                    : p.PredictedWinnerId == match.WinnerTeamId;

                p.IsCorrect = correctWinner;
                p.PointsAwarded = correctWinner ? 100 : 0;
                p.UpdatedAtUtc = DateTime.UtcNow;
            }
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
