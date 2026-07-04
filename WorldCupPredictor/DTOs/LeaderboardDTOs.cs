namespace WorldCupPredictor.DTOs
{
    public class LeaderboardEntryDTO
    {
        public int Rank { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? CountryIso { get; set; }
        public int TotalPredictions { get; set; }
        public int CorrectPredictions { get; set; }
        public int Points { get; set; }
        public double Accuracy { get; set; }
    }

    public class AdminStatsDTO
    {
        public int TotalTeams { get; set; }
        public int TotalMatches { get; set; }
        public int TotalUsers { get; set; }
        public int TotalPredictions { get; set; }
    }
}
