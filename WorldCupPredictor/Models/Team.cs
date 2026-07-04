using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorldCupPredictor.Models
{
    /// <summary>
    /// Represents a national team competing in the tournament.
    /// </summary>
    public class Team
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Group letter, A through L (12 groups of 4 teams = 48 teams).
        /// </summary>
        [Required]
        [MaxLength(1)]
        public string Group { get; set; } = string.Empty;

        public int FifaRanking { get; set; }

        /// <summary>
        /// Average goals scored per match (used as the "Attack" input).
        /// </summary>
        public double AttackRating { get; set; }

        /// <summary>
        /// Average goals conceded per match (used as the "Defense" input).
        /// </summary>
        public double DefenseRating { get; set; }

        /// <summary>
        /// Wins out of the last 5 matches (0-5), used as the "Form" input.
        /// </summary>
        public int Form { get; set; }

        /// <summary>
        /// Average possession percentage (0-100).
        /// </summary>
        public double Possession { get; set; }

        // ----- Navigation -----
        [NotMapped]
        public ICollection<Match>? HomeMatches { get; set; }

        [NotMapped]
        public ICollection<Match>? AwayMatches { get; set; }
    }
}
