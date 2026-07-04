using WorldCupPredictor.Models;

namespace WorldCupPredictor.DTOs
{
    /// <summary>
    /// Used to manually create a match via POST /api/matches.
    /// </summary>
    public class CreateMatchDTO
    {
        public int TeamAId { get; set; }
        public int TeamBId { get; set; }
        public TournamentStage Stage { get; set; }
        public string? GroupName { get; set; }
    }

    /// <summary>
    /// Used to record a match's real, final result via PUT /api/matches/{id}/result.
    /// </summary>
    public class SetMatchResultDTO
    {
        public int TeamAScore { get; set; }
        public int TeamBScore { get; set; }
        public int? WinnerTeamId { get; set; }
        public bool DecidedByPenalties { get; set; }
    }

    /// <summary>
    /// Shape returned to clients for a match, including resolved team names.
    /// </summary>
    public class MatchDTO
    {
        public int Id { get; set; }
        public int TeamAId { get; set; }
        public string TeamAName { get; set; } = string.Empty;
        public int TeamBId { get; set; }
        public string TeamBName { get; set; } = string.Empty;
        public int TeamAScore { get; set; }
        public int TeamBScore { get; set; }
        public string Stage { get; set; } = string.Empty;
        public string? GroupName { get; set; }
        public bool IsPlayed { get; set; }
        public int? WinnerTeamId { get; set; }
        public bool DecidedByPenalties { get; set; }
    }
}
