using System.Security.Cryptography;

namespace WorldCupPredictor.Services
{
    /// <summary>
    /// PBKDF2-SHA256 password hashing using only the built-in .NET crypto APIs —
    /// deliberately avoids adding a BCrypt/Argon2 NuGet dependency.
    /// </summary>
    public class PasswordHasher : IPasswordHasher
    {
        private const int SaltSizeBytes = 16;
        private const int HashSizeBytes = 32;
        private const int Iterations = 100_000;

        public (string Hash, string Salt) HashPassword(string password)
        {
            var saltBytes = RandomNumberGenerator.GetBytes(SaltSizeBytes);
            var hashBytes = Rfc2898DeriveBytes.Pbkdf2(password, saltBytes, Iterations, HashAlgorithmName.SHA256, HashSizeBytes);
            return (Convert.ToBase64String(hashBytes), Convert.ToBase64String(saltBytes));
        }

        public bool VerifyPassword(string password, string hash, string salt)
        {
            var saltBytes = Convert.FromBase64String(salt);
            var expectedHash = Convert.FromBase64String(hash);
            var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, saltBytes, Iterations, HashAlgorithmName.SHA256, HashSizeBytes);
            return CryptographicOperations.FixedTimeEquals(expectedHash, actualHash);
        }
    }
}
