namespace WorldCupPredictor.Models
{
    /// <summary>
    /// Runtime (non-persisted) standings row for a single team within a group.
    /// Built on the fly from played Match rows - it is not an EF Core entity.
    /// </summary>
    public class GroupStandingRow
    {
        public int TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string Group { get; set; } = string.Empty;

        public int Played { get; set; }
        public int Wins { get; set; }
        public int Draws { get; set; }
        public int Losses { get; set; }

        public int GoalsFor { get; set; }
        public int GoalsAgainst { get; set; }
        public int GoalDifference => GoalsFor - GoalsAgainst;

        /// <summary>Win = 2 points, Draw = 1 point, Loss = 0 points (per spec).</summary>
        public int Points { get; set; }
    }

    /// <summary>
    /// A full group (4 teams) with its computed standings table, sorted by
    /// Points -> Goal Difference -> Goals Scored as required by the spec.
    /// </summary>
    public class GroupTable
    {
        public string GroupName { get; set; } = string.Empty;
        public List<GroupStandingRow> Standings { get; set; } = new();
    }
}
