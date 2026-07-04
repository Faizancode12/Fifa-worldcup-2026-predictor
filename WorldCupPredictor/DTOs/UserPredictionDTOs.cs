namespace WorldCupPredictor.DTOs
{
    public class SubmitPredictionDTO
    {
        public int MatchId { get; set; }
        public int? PredictedWinnerId { get; set; }
        public int? PredictedScoreA { get; set; }
        public int? PredictedScoreB { get; set; }
    }

    /// <summary>
    /// Result of POST /api/predictions/ai-predict/{matchId} — the AI's own resolution of a
    /// match (winner + scoreline), plus how the CURRENT user's previously-saved pick graded
    /// against it (if they made one before the AI predicted).
    /// </summary>
    public class AiPredictResultDTO
    {
        public int MatchId { get; set; }
        public string TeamAName { get; set; } = string.Empty;
        public string TeamBName { get; set; } = string.Empty;
        public int? PredictedWinnerId { get; set; }
        public string? PredictedWinnerName { get; set; }
        public int PredictedScoreA { get; set; }
        public int PredictedScoreB { get; set; }
        public bool DecidedByPenalties { get; set; }

        /// <summary>The team id the current user picked before the AI resolved this match (null if they never picked).</summary>
        public int? YourPickTeamId { get; set; }
        public bool? YourPickIsCorrect { get; set; }
        public int YourPickPointsAwarded { get; set; }
    }

    public class UserPredictionDTO
    {
        public int Id { get; set; }
        public int MatchId { get; set; }
        public string TeamAName { get; set; } = string.Empty;
        public string TeamBName { get; set; } = string.Empty;
        public int? PredictedWinnerId { get; set; }
        public int? PredictedScoreA { get; set; }
        public int? PredictedScoreB { get; set; }
        public bool? IsCorrect { get; set; }
        public int PointsAwarded { get; set; }
        public bool MatchIsPlayed { get; set; }
    }
}
