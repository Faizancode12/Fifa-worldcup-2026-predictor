using System.Security.Cryptography;

namespace WorldCupPredictor.Services
{
    public class TokenService : ITokenService
    {
        public string GenerateToken()
        {
            // 48 random bytes -> URL-safe base64, ~64 chars. Cryptographically strong, unguessable.
            var bytes = RandomNumberGenerator.GetBytes(48);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }
    }
}
