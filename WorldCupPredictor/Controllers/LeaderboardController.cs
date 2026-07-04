using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Data;
using WorldCupPredictor.DTOs;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api/leaderboard")]
    public class LeaderboardController : ControllerBase
    {
        private readonly AppDbContext _db;

        public LeaderboardController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// GET /api/leaderboard - real, ranked standings built only from actual registered
        /// users and their actually-submitted predictions. No mock/random entries: a user
        /// with zero predictions shows 0 points; nobody who hasn't registered appears at all.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LeaderboardEntryDTO>>> Get()
        {
            var users = await _db.Users.AsNoTracking().ToListAsync();
            var predictions = await _db.UserPredictions.AsNoTracking().ToListAsync();

            var rows = users.Select(u =>
            {
                var mine = predictions.Where(p => p.UserId == u.Id).ToList();
                var graded = mine.Where(p => p.IsCorrect.HasValue).ToList();
                var correct = graded.Count(p => p.IsCorrect == true);
                var points = mine.Sum(p => p.PointsAwarded);
                var accuracy = graded.Count > 0 ? Math.Round(100.0 * correct / graded.Count, 1) : 0.0;

                return new LeaderboardEntryDTO
                {
                    UserId = u.Id,
                    Username = u.Username,
                    CountryIso = u.CountryIso,
                    TotalPredictions = mine.Count,
                    CorrectPredictions = correct,
                    Points = points,
                    Accuracy = accuracy,
                };
            })
            .OrderByDescending(r => r.Points)
            .ThenByDescending(r => r.Accuracy)
            .ThenBy(r => r.Username)
            .ToList();

            for (int i = 0; i < rows.Count; i++) rows[i].Rank = i + 1;

            return Ok(rows);
        }
    }
}
