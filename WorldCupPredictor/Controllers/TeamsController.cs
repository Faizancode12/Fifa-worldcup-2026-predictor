using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Data;
using WorldCupPredictor.Models;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api/teams")]
    public class TeamsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TeamsController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>GET /api/teams - returns all 48 teams (optionally filtered by group).</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Team>>> GetAll([FromQuery] string? group)
        {
            var query = _db.Teams.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(group))
            {
                var g = group.Trim().ToUpperInvariant();
                query = query.Where(t => t.Group == g);
            }

            var teams = await query.OrderBy(t => t.Group).ThenBy(t => t.FifaRanking).ToListAsync();
            return Ok(teams);
        }

        /// <summary>GET /api/teams/{id}</summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Team>> GetById(int id)
        {
            var team = await _db.Teams.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (team == null) return NotFound(new { message = $"Team {id} not found." });
            return Ok(team);
        }

        /// <summary>POST /api/teams - adds a new team (e.g. for testing/extending beyond the fixed 48).</summary>
        [HttpPost]
        public async Task<ActionResult<Team>> Create([FromBody] Team team)
        {
            if (string.IsNullOrWhiteSpace(team.Name))
                return BadRequest(new { message = "Team name is required." });

            _db.Teams.Add(team);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = team.Id }, team);
        }
    }
}
