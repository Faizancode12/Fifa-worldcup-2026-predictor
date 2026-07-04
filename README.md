🏆 FIFA World Cup 2026 Prediction & Simulation System

A full-stack web app that simulates the entire 48-team FIFA World Cup 2026 group stage through the Final  using a transparent, rule-based prediction engine, real user accounts, and a live leaderboard.

Users can register, log in, make their own picks for upcoming matches, then let the AI engine resolve each match once (with a real scoreline, not just a winner), and compete against other registered users on the leaderboard.


✨ Features


48 fixed national teams, seeded across 12 groups (A–L), each with a FIFA ranking, attack rating, defense rating, form, and possession stat
Rule-based prediction engine that scores every matchup and simulates a realistic result (see How predictions work)
Full tournament simulation: Group Stage → Round of 32 → Round of 16 → Quarterfinals → Semifinals → Final
Real user accounts — registration/login with securely hashed & salted passwords (PBKDF2), session-based bearer tokens
User predictions — logged-in users can pick a winner/scoreline for any unplayed match before the AI locks it in
Live leaderboard — ranks real users by points earned from correct picks, with accuracy %
Admin view for monitoring teams, matches, and prediction counts
Swagger / OpenAPI docs for exploring and testing the API directly



🧱 Tech Stack

LayerTechnologyBackendASP.NET Core 8 Web API (C#)ORMEntity Framework Core 8 + Pomelo.EntityFrameworkCore.MySqlDatabaseMySQL / MariaDB (InnoDB)AuthCustom opaque bearer-token scheme (no JWT dependency) — tokens validated against a UserSessions tableFrontendVanilla HTML / CSS / JavaScript + Chart.jsAPI DocsSwashbuckle (Swagger UI)


📁 Project Structure

├── frontend/                     # Static site (HTML/CSS/JS)
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── vendor/chart.umd.js
│
├── backend/
│   └── WorldCupPredictor/
│       ├── Controllers/          # Auth, Teams, Matches, Predictions, UserPredictions, Leaderboard, Tournament, Admin
│       ├── Services/             # PredictionEngine, TournamentService, TokenService, PasswordHasher
│       ├── Models/                # Team, Match, User, UserSession, UserPrediction, PredictionResult, ...
│       ├── DTOs/
│       ├── Auth/                 # TokenAuthenticationHandler
│       ├── Data/AppDbContext.cs
│       └── Program.cs
│
├── worldcup2026.sql              # Full schema + seed data (⚠️ drops existing DB  fresh installs only)
├── backend/worldcup_updated.sql  # Same schema, kept in sync
├── backend/add_user_tables.sql   # Adds Users/Sessions/UserPredictions to an EXISTING db, non-destructive
├── backend/add_ai_predict_columns.sql
└── backend/fix_stage_column.sql / fix_boolean_columns.sql   # Non-destructive column-type migrations


🧠 How Predictions Work

The current engine is rule-based, not machine learning every result is fully explainable and deterministic given a team's stats plus one random roll.

For each team, an AI Score is calculated as a weighted blend of:

FactorWeightFIFA Ranking30%Recent Form25%Attack Rating20%Defense Rating15%Possession10%

The gap between two teams' AI Scores is passed through a logistic (sigmoid) curve to produce win/draw/loss probabilities  this is the same style of approach real Elo-based forecasters use, and it lets close matchups stay close to 50/50 while genuine mismatches swing sharply (e.g. a ~0.35 score gap becomes roughly a 90/10 split). A minimum win-share floor is enforced so even heavy underdogs retain a real chance of an upset  nothing is ever "impossible."

Once probabilities are set, the actual outcome is rolled against them, and a realistic scoreline is generated from there. Each match's AI prediction is computed once and cached  replaying the same match always returns the same result, and every user's stored pick is graded against that single official result (+100 points for a correct pick).


🤖 Planned: Real Machine Learning Upgrade

The current engine is intentionally simple and transparent, but it's built to be swapped out. The natural next step for this project is replacing (or augmenting) the hand-weighted formula with a real ML model trained on historical data, for example:


Training a model (e.g. gradient-boosted trees like XGBoost/LightGBM, or a small neural net) on historical international match data  actual results, goals scored/conceded, head-to-head history, squad changes, injuries, and tournament context rather than static hand-picked weights
Using Elo-style rating histories pulled from real match archives as a feature instead of a single fixed FIFA ranking snapshot
Adding time-series form (rolling performance over the last N matches) instead of a static "Form" field
Incorporating player-level data (injuries, suspensions, top scorer availability) for more granular predictions
Retraining periodically as new real-world results come in, so the model improves each real tournament cycle instead of staying static
Exposing model confidence/uncertainty (not just a point prediction) so users can see how sure the model actually is
Keeping the current rule-based engine as a fallback/baseline to compare the ML model against, and for transparency when explaining a prediction


This would turn the project from a fixed-formula simulator into a genuinely learning system that gets sharper over time as more real match data becomes available  a natural v2 for this repo.
