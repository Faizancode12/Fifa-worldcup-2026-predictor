using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;

namespace WorldCupPredictor.Services
{
    public interface ITournamentService
    {
        /// <summary>
        /// Runs the full 48-team World Cup: group stage, then R32, R16, QF, SF, Final.
        /// Clears any previous simulation data and persists every match/prediction.
        /// </summary>
        Task<TournamentResultDTO> SimulateFullTournamentAsync();

        /// <summary>
        /// Returns the current group standings table(s), computed from persisted
        /// group-stage matches. Pass null to get all 12 groups.
        /// </summary>
        Task<List<GroupTable>> GetStandingsAsync(string? group);

        /// <summary>
        /// Returns every knockout-stage match (R32 onward) in the most recent simulation.
        /// </summary>
        Task<List<MatchDTO>> GetBracketAsync();
    }
}
