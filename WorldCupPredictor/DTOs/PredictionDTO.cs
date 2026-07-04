namespace WorldCupPredictor.DTOs
{
    /// <summary>
    /// Result of running the AI PredictionEngine against a single match.
    /// </summary>
    public class PredictionDTO
    {
        public int MatchId { get; set; }

        public int TeamAId { get; set; }
        public string TeamAName { get; set; } = string.Empty;
        public int TeamBId { get; set; }
        public string TeamBName { get; set; } = string.Empty;

        public double AiScoreA { get; set; }
        public double AiScoreB { get; set; }

        public double WinProbabilityA { get; set; }
        public double WinProbabilityB { get; set; }
        public double DrawProbability { get; set; }

        /// <summary>Null when the predicted outcome is a draw (group stage only).</summary>
        public int? PredictedWinnerId { get; set; }
        public string? PredictedWinnerName { get; set; }

        public int PredictedScoreA { get; set; }
        public int PredictedScoreB { get; set; }

        public bool DecidedByPenalties { get; set; }
    }

    /// <summary>
    /// Summary returned after simulating the entire tournament.
    /// </summary>
    public class TournamentResultDTO
    {
        public int ChampionTeamId { get; set; }
        public string ChampionTeamName { get; set; } = string.Empty;
        public int RunnerUpTeamId { get; set; }
        public string RunnerUpTeamName { get; set; } = string.Empty;
        public List<MatchDTO> AllMatches { get; set; } = new();
    }
}
