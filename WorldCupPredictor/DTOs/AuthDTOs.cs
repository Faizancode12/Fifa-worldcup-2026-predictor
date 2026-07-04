using System.ComponentModel.DataAnnotations;

namespace WorldCupPredictor.DTOs
{
    public class RegisterRequestDTO
    {
        [Required] public string FullName { get; set; } = string.Empty;
        [Required] public string Username { get; set; } = string.Empty;
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
        [Required, MinLength(6)] public string Password { get; set; } = string.Empty;
        public string? CountryIso { get; set; }
    }

    public class LoginRequestDTO
    {
        /// <summary>Accepts either an email or a username.</summary>
        [Required] public string Email { get; set; } = string.Empty;
        [Required] public string Password { get; set; } = string.Empty;
    }

    public class AuthResponseDTO
    {
        public string Token { get; set; } = string.Empty;
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? CountryIso { get; set; }
        public bool IsAdmin { get; set; }
    }
}
