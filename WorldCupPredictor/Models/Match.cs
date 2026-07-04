using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorldCupPredictor.Models
{
    /// <summary>
    /// Represents a single match between two teams at a given tournament stage.
    /// </summary>
    public class Match
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TeamAId { get; set; }

        [ForeignKey(nameof(TeamAId))]
        public Team? TeamA { get; set; }

        [Required]
        public int TeamBId { get; set; }

        [ForeignKey(nameof(TeamBId))]
        public Team? TeamB { get; set; }

        public int TeamAScore { get; set; }

        public int TeamBScore { get; set; }

        [Required]
        public TournamentStage Stage { get; set; }

        /// <summary>
        /// Group letter (A-L) when Stage == Group, otherwise null.
        /// </summary>
        [MaxLength(1)]
        public string? GroupName { get; set; }

        /// <summary>
        /// True once the match has been simulated/decided.
        /// </summary>
        public bool IsPlayed { get; set; }

        /// <summary>
        /// Winner team id. Null for a group-stage draw.
        /// </summary>
        public int? WinnerTeamId { get; set; }

        /// <summary>
        /// True if this match was resolved on penalties (knockout-only).
        /// </summary>
        public bool DecidedByPenalties { get; set; }

        public DateTime SimulatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
