using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorldCupPredictor.Models
{
    /// <summary>
    /// A logged-in user's own prediction/pick for a specific match — separate from
    /// PredictionResult (which is the AI engine's own prediction). Each real user gets
    /// at most one row per match (enforced by a unique index on UserId+MatchId).
    /// This table is what the real leaderboard and admin "Predictions" count are built from.
    /// </summary>
    public class UserPrediction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Required]
        public int MatchId { get; set; }

        [ForeignKey(nameof(MatchId))]
        public Match? Match { get; set; }

        /// <summary>The team id the user picked to win. Null means the user predicted a draw.</summary>
        public int? PredictedWinnerId { get; set; }

        public int? PredictedScoreA { get; set; }

        public int? PredictedScoreB { get; set; }

        /// <summary>Set once the real match result is known and this prediction has been graded.</summary>
        public bool? IsCorrect { get; set; }

        public int PointsAwarded { get; set; } = 0;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
