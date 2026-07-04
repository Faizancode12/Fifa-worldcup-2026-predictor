using WorldCupPredictor.DTOs;
using WorldCupPredictor.Models;

namespace WorldCupPredictor.Services
{
    public interface IPredictionEngine
    {
        /// <summary>
        /// Computes the normalized AI Score (0-1) for a single team using the
        /// weighted formula from the spec:
        /// Ranking(30%) + Form(25%) + Attack(20%) + Defense(15%) + Possession(10%)
        /// </summary>
        double CalculateAiScore(Team team);

        /// <summary>
        /// Predicts the outcome of a match between two teams.
        /// </summary>
        /// <param name="teamA">First team.</param>
        /// <param name="teamB">Second team.</param>
        /// <param name="allowDraw">
        /// True for group-stage matches (draws permitted). False for knockout
        /// matches, where a tied scoreline is automatically resolved via a
        /// simulated penalty shootout.
        /// </param>
        PredictionDTO PredictMatch(Team teamA, Team teamB, bool allowDraw);
    }
}
