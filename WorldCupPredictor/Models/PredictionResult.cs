using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorldCupPredictor.Models
{
    /// <summary>
    /// Persisted AI prediction for a given match (the "Predictions" table).
    /// </summary>
    public class PredictionResult
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MatchId { get; set; }

        [ForeignKey(nameof(MatchId))]
        public Match? Match { get; set; }

        /// <summary>
        /// Predicted winner team id. Null when a draw is predicted (group stage only).
        /// </summary>
        public int? PredictedWinner { get; set; }

        public double WinProbabilityA { get; set; }

        public double WinProbabilityB { get; set; }

        public double DrawProbability { get; set; }

        /// <summary>
        /// Raw AI scores (0-1) used to produce this prediction, kept for transparency/auditing.
        /// </summary>
        public double AiScoreA { get; set; }

        public double AiScoreB { get; set; }

        /// <summary>
        /// The AI-generated scoreline (goals), persisted so the match resolves to the SAME
        /// result every time instead of a fresh random roll on every read.
        /// </summary>
        public int? PredictedScoreA { get; set; }

        public int? PredictedScoreB { get; set; }

        /// <summary>True if a tied scoreline was decided by penalties (knockout stages only).</summary>
        public bool DecidedByPenalties { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
