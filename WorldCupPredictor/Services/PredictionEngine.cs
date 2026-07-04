using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;

namespace WorldCupPredictor.Services
{
    /// <summary>
    /// Rule-based (NOT machine learning) prediction engine. Computes a weighted
    /// "AI Score" per team from ranking, form, attack, defense and possession,
    /// then derives win/draw probabilities and a realistic scoreline from it.
    /// </summary>
    public class PredictionEngine : IPredictionEngine
    {
        // Normalization constants
        private const double MaxFifaRank = 211.0;   // ranking score denominator
        private const double MaxGoalsPerMatch = 3.0; // attack score denominator
        private const double MaxConcededPerMatch = 3.0; // defense score denominator

        // Formula weights (must sum to 1.0)
        private const double RankingWeight = 0.30;
        private const double FormWeight = 0.25;
        private const double AttackWeight = 0.20;
        private const double DefenseWeight = 0.15;
        private const double PossessionWeight = 0.10;

        private readonly Random _random = new();

        public double CalculateAiScore(Team team)
        {
            double rankingScore = Clamp01((MaxFifaRank - team.FifaRanking) / 210.0);
            double formScore = Clamp01(team.Form / 5.0);
            double attackScore = Clamp01(team.AttackRating / MaxGoalsPerMatch);
            double defenseScore = Clamp01(1.0 - (team.DefenseRating / MaxConcededPerMatch));
            double possessionScore = Clamp01(team.Possession / 100.0);

            double aiScore =
                (rankingScore * RankingWeight) +
                (formScore * FormWeight) +
                (attackScore * AttackWeight) +
                (defenseScore * DefenseWeight) +
                (possessionScore * PossessionWeight);

            return Math.Round(aiScore, 4);
        }

        // Underdogs are never given less than this pre-draw win share, so a real
        // upset stays genuinely possible even in the most lopsided matchups.
        private const double MinWinShare = 0.12;

        // Chance that an upset winner scores a real statement result (2-3 goals)
        // instead of the far more common narrow 1-0 upset.
        private const double BigUpsetChance = 0.12;

        public PredictionDTO PredictMatch(Team teamA, Team teamB, bool allowDraw)
        {
            double scoreA = CalculateAiScore(teamA);
            double scoreB = CalculateAiScore(teamB);
            double diff = scoreA - scoreB;
            double absDiff = Math.Abs(diff);

            // ----- Win / draw probabilities -----
            double drawProbability = allowDraw ? Clamp(0.28 - (absDiff * 1.2), 0.06, 0.28) : 0.0;

            // Logistic (sigmoid) win-share model, the same style real Elo-based
            // predictors use: it separates strong mismatches much more sharply
            // than a raw score1/(score1+score2) ratio would (AI scores tend to
            // cluster close together, so a plain ratio barely moves off 50/50).
            // Slope of 6.0 means: ~0.19 AI-score gap -> ~75/25, ~0.35+ gap -> ~90/10.
            const double LogisticSlope = 6.0;
            double softenedSplitA = 1.0 / (1.0 + Math.Exp(-diff * LogisticSlope));
            softenedSplitA = Clamp(softenedSplitA, MinWinShare, 1 - MinWinShare);

            double winProbabilityA = Math.Round((1 - drawProbability) * softenedSplitA, 4);
            double winProbabilityB = Math.Round((1 - drawProbability) * (1 - softenedSplitA), 4);
            drawProbability = Math.Round(1 - winProbabilityA - winProbabilityB, 4);

            // ----- Roll the ACTUAL outcome using those probabilities -----
            // This is what makes upsets real: a team with a 15% win chance will
            // actually win about 1 in 7 times over many matches, not "never".
            double roll = _random.NextDouble();
            bool isDraw = allowDraw && roll < drawProbability;
            bool aWins = !isDraw && roll < drawProbability + winProbabilityA;

            int predictedScoreA;
            int predictedScoreB;
            bool decidedByPenalties = false;
            int? predictedWinnerId;

            if (isDraw)
            {
                // Draws are still shaped by how close the teams actually are.
                bool nilNil = absDiff < 0.06 && _random.Next(0, 2) == 0;
                int goals = nilNil ? 0 : 1;
                predictedScoreA = goals;
                predictedScoreB = goals;
                predictedWinnerId = null;
            }
            else
            {
                bool favoriteWon = (aWins && diff >= 0) || (!aWins && diff < 0);
                int winnerGoals, loserGoals;

                if (favoriteWon)
                {
                    // Expected result - scoreline follows the spec's bands.
                    if (absDiff >= 0.15) { winnerGoals = 3; loserGoals = _random.Next(0, 2); }
                    else if (absDiff >= 0.08) { winnerGoals = 2; loserGoals = 1; }
                    else { winnerGoals = _random.Next(0, 2) == 0 ? 1 : 2; loserGoals = 1; }
                }
                else
                {
                    // UPSET - the lower-rated side won. Real upsets are usually
                    // tight (1-0, 2-1); occasionally it's a real statement result.
                    bool bigUpset = _random.NextDouble() < BigUpsetChance;
                    winnerGoals = bigUpset ? _random.Next(2, 4) : 1; // 2-3 goals on a big upset, else 1
                    loserGoals = bigUpset ? _random.Next(0, 2) : 0;  // usually 1-0, sometimes 2-1/3-1
                    if (winnerGoals <= loserGoals) winnerGoals = loserGoals + 1;
                }

                if (aWins)
                {
                    predictedScoreA = winnerGoals;
                    predictedScoreB = loserGoals;
                    predictedWinnerId = teamA.Id;
                }
                else
                {
                    predictedScoreB = winnerGoals;
                    predictedScoreA = loserGoals;
                    predictedWinnerId = teamB.Id;
                }
            }

            // Knockout matches can't stay level - break scoreline ties via penalties.
            if (!allowDraw && predictedScoreA == predictedScoreB)
            {
                decidedByPenalties = true;
                double penaltyEdgeA = 0.5 + Clamp(diff * 0.5, -0.1, 0.1); // small edge to the better AI score
                predictedWinnerId = _random.NextDouble() < penaltyEdgeA ? teamA.Id : teamB.Id;
            }

            return new PredictionDTO
            {
                TeamAId = teamA.Id,
                TeamAName = teamA.Name,
                TeamBId = teamB.Id,
                TeamBName = teamB.Name,
                AiScoreA = scoreA,
                AiScoreB = scoreB,
                WinProbabilityA = winProbabilityA,
                WinProbabilityB = winProbabilityB,
                DrawProbability = drawProbability,
                PredictedWinnerId = predictedWinnerId,
                PredictedWinnerName = predictedWinnerId == teamA.Id ? teamA.Name
                                     : predictedWinnerId == teamB.Id ? teamB.Name
                                     : null,
                PredictedScoreA = predictedScoreA,
                PredictedScoreB = predictedScoreB,
                DecidedByPenalties = decidedByPenalties
            };
        }

        private static double Clamp01(double value) => Clamp(value, 0.0, 1.0);

        private static double Clamp(double value, double min, double max)
            => Math.Max(min, Math.Min(max, value));
    }
}
