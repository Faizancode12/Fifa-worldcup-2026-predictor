using System.ComponentModel.DataAnnotations;

namespace WorldCupPredictor.Models
{
    /// <summary>
    /// A real registered account. Passwords are never stored in plain text —
    /// only a PBKDF2 hash + a per-user random salt (System.Security.Cryptography,
    /// no extra NuGet package required).
    /// </summary>
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string FullName { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public string PasswordSalt { get; set; } = string.Empty;

        /// <summary>ISO country code (e.g. "mx") used to show a flag on the leaderboard. Optional.</summary>
        [MaxLength(5)]
        public string? CountryIso { get; set; }

        public bool IsAdmin { get; set; } = false;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
