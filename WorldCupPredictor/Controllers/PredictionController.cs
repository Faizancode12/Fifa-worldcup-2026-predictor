using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Data;
using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;
using WorldCupPredictor.Services;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api/prediction")]
    public class PredictionController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPredictionEngine _engine;
        private readonly ITournamentService _tournamentService;
        private readonly ILogger<PredictionController> _logger;

        public PredictionController(
            AppDbContext db,
            IPredictionEngine engine,
            ITournamentService tournamentService,
            ILogger<PredictionController> logger)
        {
            _db = db;
            _engine = engine;
            _tournamentService = tournamentService;
            _logger = logger;
        }

        /// <summary>
        /// GET /api/prediction/match/{id} - runs the AI engine against an existing
        /// (or already-played) match and returns the prediction. Persists/updates
        /// the corresponding PredictionResult row.
        /// </summary>
        [HttpGet("match/{id:int}")]
        public async Task<ActionResult<PredictionDTO>> PredictMatch(int id)
        {
            var match = await _db.Matches
                .Include(m => m.TeamA)
                .Include(m => m.TeamB)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (match == null || match.TeamA == null || match.TeamB == null)
                return NotFound(new { message = $"Match {id} not found." });

            // Cache-once: reuse the existing prediction if we've already computed one for this
            // match, so repeated calls (and every user grading against it) see the SAME result
            // instead of a fresh random roll each time.
            var existing = await _db.Predictions.FirstOrDefaultAsync(p => p.MatchId == match.Id);
            if (existing != null)
            {
                return Ok(new PredictionDTO
                {
                    MatchId = match.Id,
                    TeamAId = match.TeamAId,
                    TeamAName = match.TeamA.Name,
                    TeamBId = match.TeamBId,
                    TeamBName = match.TeamB.Name,
                    AiScoreA = existing.AiScoreA,
                    AiScoreB = existing.AiScoreB,
                    WinProbabilityA = existing.WinProbabilityA,
                    WinProbabilityB = existing.WinProbabilityB,
                    DrawProbability = existing.DrawProbability,
                    PredictedWinnerId = existing.PredictedWinner,
                    PredictedWinnerName = existing.PredictedWinner == match.TeamAId ? match.TeamA.Name
                                         : existing.PredictedWinner == match.TeamBId ? match.TeamB.Name
                                         : null,
                    PredictedScoreA = existing.PredictedScoreA ?? 0,
                    PredictedScoreB = existing.PredictedScoreB ?? 0,
                    DecidedByPenalties = existing.DecidedByPenalties
                });
            }

            bool allowDraw = match.Stage == TournamentStage.Group;
            var prediction = _engine.PredictMatch(match.TeamA, match.TeamB, allowDraw);
            prediction.MatchId = match.Id;

            _db.Predictions.Add(new PredictionResult
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
                DecidedByPenalties = prediction.DecidedByPenalties
            });

            await _db.SaveChangesAsync();
            _logger.LogInformation(
                "Predicted match {MatchId}: {TeamA} vs {TeamB} -> {ScoreA}-{ScoreB} (winner: {Winner})",
                match.Id, match.TeamA.Name, match.TeamB.Name,
                prediction.PredictedScoreA, prediction.PredictedScoreB,
                prediction.PredictedWinnerName ?? "Draw");

            return Ok(prediction);
        }

        /// <summary>
        /// POST /api/prediction/simulate-tournament - runs the full 48-team World Cup
        /// simulation end-to-end and returns the champion plus every match played.
        /// </summary>
        [HttpPost("simulate-tournament")]
        public async Task<ActionResult<TournamentResultDTO>> SimulateTournament()
        {
            _logger.LogInformation("Starting full tournament simulation.");
            var result = await _tournamentService.SimulateFullTournamentAsync();
            _logger.LogInformation("Tournament complete. Champion: {Champion}", result.ChampionTeamName);
            return Ok(result);
        }
    }
}
