using Microsoft.AspNetCore.Mvc;
using WorldCupPredictor.DTOs;
using WorldCupPredictor.Services;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api/tournament")]
    public class TournamentController : ControllerBase
    {
        private readonly ITournamentService _tournamentService;
        private readonly ILogger<TournamentController> _logger;

        public TournamentController(ITournamentService tournamentService, ILogger<TournamentController> logger)
        {
            _tournamentService = tournamentService;
            _logger = logger;
        }

        /// <summary>GET /api/tournament/simulate - runs the full simulation (same engine as the POST prediction endpoint).</summary>
        [HttpGet("simulate")]
        public async Task<ActionResult<TournamentResultDTO>> Simulate()
        {
            _logger.LogInformation("Starting full tournament simulation via /tournament/simulate.");
            var result = await _tournamentService.SimulateFullTournamentAsync();
            return Ok(result);
        }

        /// <summary>GET /api/tournament/standings?group=A - group table(s) from the latest simulation.</summary>
        [HttpGet("standings")]
        public async Task<IActionResult> GetStandings([FromQuery] string? group)
        {
            var standings = await _tournamentService.GetStandingsAsync(group);
            return Ok(standings);
        }

        /// <summary>GET /api/tournament/bracket - the knockout bracket (R32 through Final) from the latest simulation.</summary>
        [HttpGet("bracket")]
        public async Task<IActionResult> GetBracket()
        {
            var bracket = await _tournamentService.GetBracketAsync();
            return Ok(bracket);
        }
    }
}
