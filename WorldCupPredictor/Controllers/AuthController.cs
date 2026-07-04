using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Auth;
using WorldCupPredictor.Data;
using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;
using WorldCupPredictor.Services;

namespace WorldCupPredictor.Controllers
{
    [ApiController]
    [Route("api")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPasswordHasher _hasher;
        private readonly ITokenService _tokens;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AppDbContext db, IPasswordHasher hasher, ITokenService tokens, ILogger<AuthController> logger)
        {
            _db = db;
            _hasher = hasher;
            _tokens = tokens;
            _logger = logger;
        }

        /// <summary>POST /api/register - creates a real account in MySQL and logs the user in.</summary>
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDTO>> Register([FromBody] RegisterRequestDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Email) || dto.Password.Length < 6)
                return BadRequest(new { message = "Username, email, and a password of at least 6 characters are required." });

            var usernameTaken = await _db.Users.AnyAsync(u => u.Username == dto.Username);
            if (usernameTaken) return Conflict(new { message = "That username is already taken." });

            var emailTaken = await _db.Users.AnyAsync(u => u.Email == dto.Email);
            if (emailTaken) return Conflict(new { message = "An account with that email already exists." });

            var (hash, salt) = _hasher.HashPassword(dto.Password);
            var user = new User
            {
                Username = dto.Username.Trim(),
                FullName = string.IsNullOrWhiteSpace(dto.FullName) ? dto.Username.Trim() : dto.FullName.Trim(),
                Email = dto.Email.Trim().ToLowerInvariant(),
                PasswordHash = hash,
                PasswordSalt = salt,
                CountryIso = dto.CountryIso,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            var session = await CreateSessionAsync(user.Id);
            _logger.LogInformation("New user registered: {Username} ({Email})", user.Username, user.Email);

            return Ok(ToAuthResponse(user, session.Token));
        }

        /// <summary>POST /api/login - verifies credentials against MySQL and issues a real session token.</summary>
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDTO>> Login([FromBody] LoginRequestDTO dto)
        {
            var identifier = dto.Email.Trim();
            var user = await _db.Users.FirstOrDefaultAsync(u =>
                u.Email == identifier.ToLower() || u.Username == identifier);

            if (user == null || !_hasher.VerifyPassword(dto.Password, user.PasswordHash, user.PasswordSalt))
                return Unauthorized(new { message = "Incorrect email/username or password." });

            var session = await CreateSessionAsync(user.Id);
            _logger.LogInformation("User logged in: {Username}", user.Username);

            return Ok(ToAuthResponse(user, session.Token));
        }

        /// <summary>POST /api/logout - invalidates the current session token server-side.</summary>
        [Authorize(AuthenticationSchemes = "Token")]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            if (Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                var token = authHeader.ToString().Replace("Bearer ", "").Trim();
                var session = await _db.UserSessions.FirstOrDefaultAsync(s => s.Token == token);
                if (session != null)
                {
                    _db.UserSessions.Remove(session);
                    await _db.SaveChangesAsync();
                }
            }
            return NoContent();
        }

        /// <summary>GET /api/me - returns the current logged-in user's profile.</summary>
        [Authorize(AuthenticationSchemes = "Token")]
        [HttpGet("me")]
        public async Task<ActionResult<AuthResponseDTO>> Me()
        {
            var userId = User.GetUserId();
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound();
            return Ok(new AuthResponseDTO
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                CountryIso = user.CountryIso,
                IsAdmin = user.IsAdmin,
            });
        }

        private async Task<UserSession> CreateSessionAsync(int userId)
        {
            var session = new UserSession { UserId = userId, Token = _tokens.GenerateToken() };
            _db.UserSessions.Add(session);
            await _db.SaveChangesAsync();
            return session;
        }

        private static AuthResponseDTO ToAuthResponse(User user, string token) => new()
        {
            Token = token,
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            CountryIso = user.CountryIso,
            IsAdmin = user.IsAdmin,
        };
    }
}
