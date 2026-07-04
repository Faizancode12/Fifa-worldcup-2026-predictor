using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WorldCupPredictor.Data;

namespace WorldCupPredictor.Auth
{
    /// <summary>
    /// Minimal "Authorization: Bearer {opaque-token}" authentication scheme, validated
    /// against the UserSessions table. Deliberately avoids a JWT NuGet dependency —
    /// this is a simple opaque-token / session-lookup scheme, which also makes
    /// logout (deleting the session row) instantly effective server-side.
    /// </summary>
    public class TokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        private readonly AppDbContext _db;

        public TokenAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            AppDbContext db) : base(options, logger, encoder)
        {
            _db = db;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
                return AuthenticateResult.NoResult();

            var raw = authHeader.ToString();
            if (string.IsNullOrWhiteSpace(raw) || !raw.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                return AuthenticateResult.NoResult();

            var token = raw["Bearer ".Length..].Trim();
            if (string.IsNullOrEmpty(token))
                return AuthenticateResult.NoResult();

            var session = await _db.UserSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Token == token);

            if (session == null || session.User == null)
                return AuthenticateResult.Fail("Invalid token.");

            if (session.ExpiresAtUtc < DateTime.UtcNow)
                return AuthenticateResult.Fail("Session expired.");

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, session.User.Id.ToString()),
                new Claim(ClaimTypes.Name, session.User.Username),
                new Claim(ClaimTypes.Email, session.User.Email),
                new Claim("IsAdmin", session.User.IsAdmin.ToString()),
            };
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
    }
}
