using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Auth;
using WorldCupPredictor.Data;
using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;
using WorldCupPredictor.Services;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api/predictions")]
    [Authorize(AuthenticationSchemes = "Token")]
    public class UserPredictionsController : ControllerBase
    {
        private const int PointsForCorrectPick = 100;

        private readonly AppDbContext _db;
        private readonly IPredictionEngine _engine;
        private readonly ILogger<UserPredictionsController> _logger;

        public UserPredictionsController(AppDbContext db, IPredictionEngine engine, ILogger<UserPredictionsController> logger)
        {
            _db = db;
            _engine = engine;
            _logger = logger;
        }

        /// <summary>
        /// POST /api/predictions/mine - creates or updates the logged-in user's PICK for a match
        /// (just their guess of who wins — nobody, including the AI, grades it yet). Rejected once
        /// the AI has already predicted/resolved this match (see POST .../ai-predict/{matchId}),
        /// since picks are locked in the moment the match is resolved.
        /// </summary>
        [HttpPost("mine")]
        public async Task<ActionResult<UserPredictionDTO>> SubmitMine([FromBody] SubmitPredictionDTO dto)
        {
            var userId = User.GetUserId();
            var match = await _db.Matches.Include(m => m.TeamA).Include(m => m.TeamB)
                .FirstOrDefaultAsync(m => m.Id == dto.MatchId);

            if (match == null) return NotFound(new { message = $"Match {dto.MatchId} not found." });
            if (match.IsPlayed) return BadRequest(new { message = "The AI has already predicted this match — picks are locked." });

            var existing = await _db.UserPredictions
                .FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == dto.MatchId);

            if (existing == null)
            {
                existing = new UserPrediction { UserId = userId, MatchId = dto.MatchId };
                _db.UserPredictions.Add(existing);
            }

            existing.PredictedWinnerId = dto.PredictedWinnerId;
            existing.PredictedScoreA = dto.PredictedScoreA;
            existing.PredictedScoreB = dto.PredictedScoreB;
            // Not graded yet — only the AI-predict step decides right/wrong and awards points.
            existing.IsCorrect = null;
            existing.PointsAwarded = 0;
            existing.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            _logger.LogInformation("User {UserId} picked match {MatchId} -> team {TeamId} (ungraded)",
                userId, dto.MatchId, dto.PredictedWinnerId);

            return Ok(ToDto(existing, match));
        }

        /// <summary>
        /// POST /api/predictions/ai-predict/{matchId} - the ONLY thing that decides a match's
        /// outcome. Computes the AI engine's prediction once and caches it (so it's the same
        /// result forever, not re-rolled on every call), marks the match played with that
        /// scoreline, and grades EVERY user's stored pick for this match against that single
        /// result (+100pts for a correct pick). Safe to call repeatedly — after the first call
        /// the match is locked and this just returns the same cached result.
        /// </summary>
        [HttpPost("ai-predict/{matchId:int}")]
        public async Task<ActionResult<AiPredictResultDTO>> AiPredict(int matchId)
        {
            var userId = User.GetUserId();
            var match = await _db.Matches.Include(m => m.TeamA).Include(m => m.TeamB)
                .FirstOrDefaultAsync(m => m.Id == matchId);

            if (match == null) return NotFound(new { message = $"Match {matchId} not found." });
            if (match.TeamA == null || match.TeamB == null)
                return BadRequest(new { message = "Both teams for this match must be known before the AI can predict it." });

            var aiPrediction = await GetOrComputeAiPredictionAsync(match);

            if (!match.IsPlayed)
            {
                match.TeamAScore = aiPrediction.PredictedScoreA ?? 0;
                match.TeamBScore = aiPrediction.PredictedScoreB ?? 0;
                match.WinnerTeamId = aiPrediction.PredictedWinner;
                match.DecidedByPenalties = aiPrediction.DecidedByPenalties;
                match.IsPlayed = true;

                // Grade every user's saved pick for this match against this one AI result.
                var allPicks = await _db.UserPredictions.Where(p => p.MatchId == match.Id).ToListAsync();
                foreach (var pick in allPicks)
                {
                    pick.IsCorrect = pick.PredictedWinnerId == aiPrediction.PredictedWinner;
                    pick.PointsAwarded = pick.IsCorrect == true ? PointsForCorrectPick : 0;
                    pick.UpdatedAtUtc = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();
                _logger.LogInformation("AI predicted match {MatchId} -> winner {WinnerId} ({ScoreA}-{ScoreB}), graded {Count} pick(s)",
                    match.Id, aiPrediction.PredictedWinner, match.TeamAScore, match.TeamBScore, allPicks.Count);
            }

            var myPick = await _db.UserPredictions.FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == matchId);

            return Ok(new AiPredictResultDTO
            {
                MatchId = match.Id,
                TeamAName = match.TeamA.Name,
                TeamBName = match.TeamB.Name,
                PredictedWinnerId = aiPrediction.PredictedWinner,
                PredictedWinnerName = aiPrediction.PredictedWinner == match.TeamAId ? match.TeamA.Name
                                     : aiPrediction.PredictedWinner == match.TeamBId ? match.TeamB.Name
                                     : null,
                PredictedScoreA = aiPrediction.PredictedScoreA ?? 0,
                PredictedScoreB = aiPrediction.PredictedScoreB ?? 0,
                DecidedByPenalties = aiPrediction.DecidedByPenalties,
                YourPickTeamId = myPick?.PredictedWinnerId,
                YourPickIsCorrect = myPick?.IsCorrect,
                YourPickPointsAwarded = myPick?.PointsAwarded ?? 0,
            });
        }

        /// <summary>GET /api/predictions/mine - all of the logged-in user's own predictions.</summary>
        [HttpGet("mine")]
        public async Task<ActionResult<IEnumerable<UserPredictionDTO>>> GetMine()
        {
            var userId = User.GetUserId();
            var predictions = await _db.UserPredictions
                .Include(p => p.Match).ThenInclude(m => m!.TeamA)
                .Include(p => p.Match).ThenInclude(m => m!.TeamB)
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.UpdatedAtUtc)
                .ToListAsync();

            return Ok(predictions.Select(p => ToDto(p, p.Match!)));
        }

        /// <summary>
        /// Returns the AI engine's full prediction (winner + scoreline) for this match, computing
        /// and persisting it (into the Predictions table) the first time it's needed so every
        /// user who predicts this match — now or later — is graded against the exact same,
        /// never-re-rolled AI call.
        /// </summary>
        private async Task<PredictionResult> GetOrComputeAiPredictionAsync(Match match)
        {
            var existingAiPrediction = await _db.Predictions.FirstOrDefaultAsync(p => p.MatchId == match.Id);
            if (existingAiPrediction != null) return existingAiPrediction;

            bool allowDraw = match.Stage == TournamentStage.Group;
            var prediction = _engine.PredictMatch(match.TeamA!, match.TeamB!, allowDraw);

            var result = new PredictionResult
            {
                MatchId = match.Id,
                PredictedWinner = prediction.PredictedWinnerId,
                WinProbabilityA = prediction.WinProbabilityA,
                WinProbabilityB = prediction.WinProbabilityB,
                DrawProbability = prediction.DrawProbability,
                AiScoreA = prediction.AiScoreA,
                AiScoreB = prediction.AiScoreB,
                PredictedScoreA = prediction.PredictedScoreA,
                PredictedScoreB = prediction.PredictedScoreB,
                DecidedByPenalties = prediction.DecidedByPenalties,
            };
            _db.Predictions.Add(result);
            await _db.SaveChangesAsync();

            return result;
        }

        private static UserPredictionDTO ToDto(UserPrediction p, Match m) => new()
        {
            Id = p.Id,
            MatchId = p.MatchId,
            TeamAName = m.TeamA?.Name ?? string.Empty,
            TeamBName = m.TeamB?.Name ?? string.Empty,
            PredictedWinnerId = p.PredictedWinnerId,
            PredictedScoreA = p.PredictedScoreA,
            PredictedScoreB = p.PredictedScoreB,
            IsCorrect = p.IsCorrect,
            PointsAwarded = p.PointsAwarded,
            MatchIsPlayed = m.IsPlayed,
        };
    }
}
