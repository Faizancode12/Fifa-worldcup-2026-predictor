using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorldCupPredictor.Models
{
    /// <summary>
    /// A single active login session. The Token is an opaque, cryptographically random
    /// string sent by the client as "Authorization: Bearer {token}". Deleting the row
    /// (logout) immediately invalidates it.
    /// </summary>
    public class UserSession
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Required, MaxLength(128)]
        public string Token { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddDays(30);
    }
}
