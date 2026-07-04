# FIFA World Cup 2026 Prediction & Simulation System

A rule-based (NOT machine-learning) AI backend for predicting and simulating
the full 48-team 2026 FIFA World Cup, built with ASP.NET Core Web API (.NET 8)
and EF Core / MySQL.

## ✅ Verified before delivery
- **All C# source files were compiled with the real .NET 8 SDK** (Models, DTOs,
  Services, Data, Controllers, and Program.cs) against a faithful stub of the
  EF Core / Pomelo / Swashbuckle APIs — result: **0 errors, 0 warnings**.
  (NuGet.org isn't reachable from this sandbox, so a *full* `dotnet build`
  with the real packages couldn't be run here — see "First-time setup" below
  to do that yourself in 30 seconds.)
- **`worldcup.sql` was executed against a live MariaDB 10.11 server** in this
  sandbox — database, all 3 tables, the standings view, and all 48 team rows
  were created with **zero SQL errors**, foreign keys and CHECK constraints
  verified, and the script was re-run from scratch to confirm it's clean and
  repeatable.

## 📁 Project structure
```
WorldCupPredictor/
├── Controllers/
│   ├── TeamsController.cs        GET/POST /api/teams
│   ├── MatchesController.cs      GET/POST /api/matches
│   ├── PredictionController.cs   /api/prediction/*
│   └── TournamentController.cs   /api/tournament/*
├── Services/
│   ├── PredictionEngine.cs       Core AI scoring + scoreline logic
│   └── TournamentService.cs      Full 48 → 32 → 16 → 8 → 4 → 2 → 1 simulation
├── Models/                       Team, Match, PredictionResult, TournamentStage, Group(standings)
├── Data/AppDbContext.cs          EF Core context + the 48-team seed data
├── DTOs/                         MatchDTO, PredictionDTO, TournamentResultDTO
├── Program.cs
├── appsettings.json
└── WorldCupPredictor.csproj
```

## 🧠 How the AI Score works
For each team:
```
RankingScore    = (211 - FifaRanking) / 210
FormScore       = Form / 5
AttackScore     = AttackRating / 3.0      (avg goals/match, capped at 3.0)
DefenseScore    = 1 - (DefenseRating / 3.0)
PossessionScore = Possession / 100

AiScore = Ranking*0.30 + Form*0.25 + Attack*0.20 + Defense*0.15 + Possession*0.10
```
The difference between two teams' AI scores drives:
- **Win/draw probabilities** (closer scores → higher draw probability)
- **The generated scoreline**, per the spec's thresholds (strong/medium/close/equal)
- **Group stage**: draws are allowed. **Knockout stage**: a tied scoreline is
  automatically resolved by a simulated penalty shootout (`DecidedByPenalties = true`).

> **Note on team stats:** the prompt fixed each team's *name, group, and FIFA
> ranking* exactly, but didn't specify Attack/Defense/Form/Possession. Those
> four inputs are derived **deterministically from FIFA ranking** (e.g. a
> top-10 team gets high attack/low-conceded/high-possession numbers, a
> bottom-of-the-table team gets weaker ones) so the dataset is internally
> consistent and reproducible. You can freely edit these per-team via
> `PUT`-style updates to the `Teams` table or by editing the seed data in
> `AppDbContext.cs` / `worldcup.sql` if you have real stats you'd rather use.

## 🏆 Tournament advancement logic
1. **Group stage** (12 groups × 4 teams, round robin, 6 matches/group): ranked
   by Points → Goal Difference → Goals Scored. Top 2 per group qualify
   automatically (24 teams); the best 8 third-place teams fill out the
   **Round of 32** (32 teams total).
2. The 32 qualifiers are seeded by AI score into a **standard single-elimination
   bracket** (seed 1 vs 32, 2 vs 31, …) so the strongest sides are spread apart —
   the prompt didn't specify a real-world group-letter pairing rule, so this
   is the simulation's seeding assumption.
3. **R32 → R16 → QF → SF → Final**, each match decided by `PredictionEngine`,
   penalties used to break any tie.

## 🌐 API Endpoints
| Method | Route | Description |
|---|---|---|
| GET | `/api/teams?group=A` | All teams, optional group filter |
| GET | `/api/teams/{id}` | Single team |
| POST | `/api/teams` | Add a team |
| GET | `/api/matches?stage=Group&group=A` | All matches, optional filters |
| GET | `/api/matches/{id}` | Single match |
| POST | `/api/matches` | Manually schedule a match |
| GET | `/api/prediction/match/{id}` | Predict an existing match |
| POST | `/api/prediction/simulate-tournament` | Run the full 48-team simulation |
| GET | `/api/tournament/simulate` | Same simulation, GET alias |
| GET | `/api/tournament/standings?group=A` | Group table(s) |
| GET | `/api/tournament/bracket` | Knockout bracket (R32 → Final) |

## 🚀 First-time setup

### 1. Install prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- MySQL 8+ or MariaDB 10.6+ running locally

### 2. Create the database
Either let EF Core do it:
```bash
cd WorldCupPredictor
dotnet tool install --global dotnet-ef   # first time only
dotnet ef migrations add InitialCreate
dotnet ef database update
```
…or just run the included SQL file directly (already tested, zero errors):
```bash
mysql -u root -p < worldcup.sql
```

### 3. Set your connection string
Edit `appsettings.json` → `ConnectionStrings:DefaultConnection` with your
MySQL username/password.

### 4. Run it
```bash
dotnet restore
dotnet build
dotnet run
```
Then open `https://localhost:5081/swagger` (or the URL printed in the
console) to try every endpoint interactively.

### 5. Simulate the World Cup
```bash
curl -X POST https://localhost:5081/api/prediction/simulate-tournament
```

## ⚙️ Tech
- ASP.NET Core Web API (.NET 8)
- Entity Framework Core 8 + Pomelo.EntityFrameworkCore.MySql
- Swashbuckle (Swagger/OpenAPI)
- Clean architecture — all logic in `Services/`, controllers stay thin
