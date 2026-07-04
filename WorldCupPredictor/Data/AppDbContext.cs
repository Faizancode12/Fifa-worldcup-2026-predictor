using Microsoft.EntityFrameworkCore;
using WorldCupPredictor.Models;

namespace WorldCupPredictor.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Team> Teams => Set<Team>();
        public DbSet<Match> Matches => Set<Match>();
        public DbSet<PredictionResult> Predictions => Set<PredictionResult>();
        public DbSet<User> Users => Set<User>();
        public DbSet<UserSession> UserSessions => Set<UserSession>();
        public DbSet<UserPrediction> UserPredictions => Set<UserPrediction>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ----- Team constraints -----
            modelBuilder.Entity<Team>()
                .Property(t => t.Name)
                .IsRequired();

            modelBuilder.Entity<Team>()
                .HasIndex(t => t.Name)
                .IsUnique();

            // ----- Match.Stage -----
            // IMPORTANT: store as VARCHAR + explicit string conversion, NOT MySQL's native
            // ENUM(...) type. Pomelo/EF maps C# enums to int by default, but MySqlConnector
            // returns a native MySQL ENUM column as its own enum-like value, which cannot be
            // read as Int32 — this caused "Can't convert Enum to Int32" on every query that
            // touched Matches. Converting to string on both sides avoids the mismatch entirely.
            modelBuilder.Entity<Match>()
                .Property(m => m.Stage)
                .HasConversion<string>()
                .HasMaxLength(20);

            // ----- Match relationships -----
            // Two FKs from Match -> Team (TeamA / TeamB). Both use Restrict
            // to avoid the multiple-cascade-paths error MySQL/SQL Server would reject.
            modelBuilder.Entity<Match>()
                .HasOne(m => m.TeamA)
                .WithMany()
                .HasForeignKey(m => m.TeamAId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Match>()
                .HasOne(m => m.TeamB)
                .WithMany()
                .HasForeignKey(m => m.TeamBId)
                .OnDelete(DeleteBehavior.Restrict);

            // ----- Prediction relationships -----
            modelBuilder.Entity<PredictionResult>()
                .HasOne(p => p.Match)
                .WithMany()
                .HasForeignKey(p => p.MatchId)
                .OnDelete(DeleteBehavior.Cascade);

            // ----- User constraints -----
            modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

            // ----- UserSession -----
            modelBuilder.Entity<UserSession>().HasIndex(s => s.Token).IsUnique();
            modelBuilder.Entity<UserSession>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ----- UserPrediction: one pick per user per match -----
            modelBuilder.Entity<UserPrediction>().HasIndex(p => new { p.UserId, p.MatchId }).IsUnique();
            modelBuilder.Entity<UserPrediction>()
                .HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<UserPrediction>()
                .HasOne(p => p.Match)
                .WithMany()
                .HasForeignKey(p => p.MatchId)
                .OnDelete(DeleteBehavior.Cascade);

            // ----- Seed the 48 fixed teams (Id, Group, FIFA ranking as given in the spec).
            // AttackRating / DefenseRating / Form / Possession are derived deterministically
            // from each team's FIFA ranking so the dataset is internally consistent. -----
            modelBuilder.Entity<Team>().HasData(
                new Team { Id = 1, Name = "Mexico", Group = "A", FifaRanking = 15, AttackRating = 2.33, DefenseRating = 0.77, Form = 5, Possession = 61 },
                new Team { Id = 2, Name = "South Korea", Group = "A", FifaRanking = 25, AttackRating = 2.21, DefenseRating = 0.89, Form = 4, Possession = 59 },
                new Team { Id = 3, Name = "Czechia", Group = "A", FifaRanking = 41, AttackRating = 2.02, DefenseRating = 1.08, Form = 4, Possession = 55 },
                new Team { Id = 4, Name = "South Africa", Group = "A", FifaRanking = 60, AttackRating = 1.79, DefenseRating = 1.31, Form = 4, Possession = 50 },
                new Team { Id = 5, Name = "Switzerland", Group = "B", FifaRanking = 19, AttackRating = 2.28, DefenseRating = 0.82, Form = 5, Possession = 60 },
                new Team { Id = 6, Name = "Canada", Group = "B", FifaRanking = 30, AttackRating = 2.15, DefenseRating = 0.95, Form = 4, Possession = 58 },
                new Team { Id = 7, Name = "Qatar", Group = "B", FifaRanking = 35, AttackRating = 2.09, DefenseRating = 1.01, Form = 4, Possession = 56 },
                new Team { Id = 8, Name = "Bosnia", Group = "B", FifaRanking = 52, AttackRating = 1.89, DefenseRating = 1.21, Form = 4, Possession = 52 },
                new Team { Id = 9, Name = "Brazil", Group = "C", FifaRanking = 6, AttackRating = 2.44, DefenseRating = 0.66, Form = 5, Possession = 64 },
                new Team { Id = 10, Name = "Morocco", Group = "C", FifaRanking = 8, AttackRating = 2.42, DefenseRating = 0.68, Form = 5, Possession = 63 },
                new Team { Id = 11, Name = "Scotland", Group = "C", FifaRanking = 47, AttackRating = 1.95, DefenseRating = 1.15, Form = 4, Possession = 53 },
                new Team { Id = 12, Name = "Haiti", Group = "C", FifaRanking = 83, AttackRating = 1.52, DefenseRating = 1.58, Form = 3, Possession = 44 },
                new Team { Id = 13, Name = "USA", Group = "D", FifaRanking = 16, AttackRating = 2.32, DefenseRating = 0.78, Form = 5, Possession = 61 },
                new Team { Id = 14, Name = "Paraguay", Group = "D", FifaRanking = 64, AttackRating = 1.74, DefenseRating = 1.36, Form = 3, Possession = 49 },
                new Team { Id = 15, Name = "Australia", Group = "D", FifaRanking = 26, AttackRating = 2.2, DefenseRating = 0.9, Form = 4, Possession = 58 },
                new Team { Id = 16, Name = "Turkiye", Group = "D", FifaRanking = 42, AttackRating = 2.01, DefenseRating = 1.09, Form = 4, Possession = 54 },
                new Team { Id = 17, Name = "Germany", Group = "E", FifaRanking = 10, AttackRating = 2.39, DefenseRating = 0.71, Form = 5, Possession = 62 },
                new Team { Id = 18, Name = "Ecuador", Group = "E", FifaRanking = 24, AttackRating = 2.22, DefenseRating = 0.88, Form = 4, Possession = 59 },
                new Team { Id = 19, Name = "Ivory Coast", Group = "E", FifaRanking = 33, AttackRating = 2.12, DefenseRating = 0.98, Form = 4, Possession = 57 },
                new Team { Id = 20, Name = "Curacao", Group = "E", FifaRanking = 81, AttackRating = 1.54, DefenseRating = 1.56, Form = 3, Possession = 45 },
                new Team { Id = 21, Name = "Netherlands", Group = "F", FifaRanking = 7, AttackRating = 2.43, DefenseRating = 0.67, Form = 5, Possession = 63 },
                new Team { Id = 22, Name = "Japan", Group = "F", FifaRanking = 18, AttackRating = 2.3, DefenseRating = 0.8, Form = 5, Possession = 60 },
                new Team { Id = 23, Name = "Sweden", Group = "F", FifaRanking = 39, AttackRating = 2.04, DefenseRating = 1.06, Form = 4, Possession = 55 },
                new Team { Id = 24, Name = "Tunisia", Group = "F", FifaRanking = 40, AttackRating = 2.03, DefenseRating = 1.07, Form = 4, Possession = 55 },
                new Team { Id = 25, Name = "Belgium", Group = "G", FifaRanking = 9, AttackRating = 2.4, DefenseRating = 0.7, Form = 5, Possession = 63 },
                new Team { Id = 26, Name = "Iran", Group = "G", FifaRanking = 21, AttackRating = 2.26, DefenseRating = 0.84, Form = 4, Possession = 60 },
                new Team { Id = 27, Name = "Egypt", Group = "G", FifaRanking = 29, AttackRating = 2.16, DefenseRating = 0.94, Form = 4, Possession = 58 },
                new Team { Id = 28, Name = "New Zealand", Group = "G", FifaRanking = 95, AttackRating = 1.37, DefenseRating = 1.73, Form = 3, Possession = 41 },
                new Team { Id = 29, Name = "Spain", Group = "H", FifaRanking = 2, AttackRating = 2.49, DefenseRating = 0.61, Form = 5, Possession = 64 },
                new Team { Id = 30, Name = "Uruguay", Group = "H", FifaRanking = 17, AttackRating = 2.31, DefenseRating = 0.79, Form = 5, Possession = 61 },
                new Team { Id = 31, Name = "Saudi Arabia", Group = "H", FifaRanking = 57, AttackRating = 1.83, DefenseRating = 1.27, Form = 4, Possession = 51 },
                new Team { Id = 32, Name = "Cape Verde", Group = "H", FifaRanking = 70, AttackRating = 1.67, DefenseRating = 1.43, Form = 3, Possession = 48 },
                new Team { Id = 33, Name = "France", Group = "I", FifaRanking = 1, AttackRating = 2.5, DefenseRating = 0.6, Form = 5, Possession = 65 },
                new Team { Id = 34, Name = "Senegal", Group = "I", FifaRanking = 14, AttackRating = 2.34, DefenseRating = 0.76, Form = 5, Possession = 62 },
                new Team { Id = 35, Name = "Norway", Group = "I", FifaRanking = 44, AttackRating = 1.98, DefenseRating = 1.12, Form = 4, Possession = 54 },
                new Team { Id = 36, Name = "Iraq", Group = "I", FifaRanking = 61, AttackRating = 1.78, DefenseRating = 1.32, Form = 3, Possession = 50 },
                new Team { Id = 37, Name = "Argentina", Group = "J", FifaRanking = 3, AttackRating = 2.48, DefenseRating = 0.62, Form = 5, Possession = 64 },
                new Team { Id = 38, Name = "Austria", Group = "J", FifaRanking = 23, AttackRating = 2.24, DefenseRating = 0.86, Form = 4, Possession = 59 },
                new Team { Id = 39, Name = "Algeria", Group = "J", FifaRanking = 36, AttackRating = 2.08, DefenseRating = 1.02, Form = 4, Possession = 56 },
                new Team { Id = 40, Name = "Jordan", Group = "J", FifaRanking = 68, AttackRating = 1.7, DefenseRating = 1.4, Form = 3, Possession = 48 },
                new Team { Id = 41, Name = "Portugal", Group = "K", FifaRanking = 5, AttackRating = 2.45, DefenseRating = 0.65, Form = 5, Possession = 64 },
                new Team { Id = 42, Name = "Colombia", Group = "K", FifaRanking = 13, AttackRating = 2.36, DefenseRating = 0.74, Form = 5, Possession = 62 },
                new Team { Id = 43, Name = "DR Congo", Group = "K", FifaRanking = 51, AttackRating = 1.9, DefenseRating = 1.2, Form = 4, Possession = 52 },
                new Team { Id = 44, Name = "Uzbekistan", Group = "K", FifaRanking = 62, AttackRating = 1.77, DefenseRating = 1.33, Form = 3, Possession = 50 },
                new Team { Id = 45, Name = "England", Group = "L", FifaRanking = 4, AttackRating = 2.46, DefenseRating = 0.64, Form = 5, Possession = 64 },
                new Team { Id = 46, Name = "Croatia", Group = "L", FifaRanking = 11, AttackRating = 2.38, DefenseRating = 0.72, Form = 5, Possession = 62 },
                new Team { Id = 47, Name = "Ghana", Group = "L", FifaRanking = 65, AttackRating = 1.73, DefenseRating = 1.37, Form = 3, Possession = 49 },
                new Team { Id = 48, Name = "Panama", Group = "L", FifaRanking = 53, AttackRating = 1.88, DefenseRating = 1.22, Form = 4, Possession = 52 }
            );
        }
    }
}