using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Data;
using WorldCupPredictor.DTOs;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// GET /api/admin/stats - real counts straight from MySQL. TotalUsers is the actual
        /// number of registered accounts; TotalPredictions is the actual number of stored
        /// user predictions (e.g. 2 real predictions from 2 real users = 2, not a mock number).
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<AdminStatsDTO>> Stats()
        {
            var stats = new AdminStatsDTO
            {
                TotalTeams = await _db.Teams.CountAsync(),
                TotalMatches = await _db.Matches.CountAsync(),
                TotalUsers = await _db.Users.CountAsync(),
                TotalPredictions = await _db.UserPredictions.CountAsync(),
            };
            return Ok(stats);
        }
    }
}
