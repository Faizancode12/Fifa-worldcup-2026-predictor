/* ============================================================================
   FIFA WORLD CUP 2026 PREDICTOR — APPLICATION LOGIC
   Vanilla ES6. No frameworks.
   ============================================================================
   Backend integration:
   Set CONFIG.API_BASE to your running WorldCupPredictor API root
   (e.g. "https://localhost:5001" or "http://localhost:5000").
   All fetch calls below target the real controller routes from the backend:
     GET  /api/teams
     GET  /api/teams/{id}
     POST /api/teams
     GET  /api/matches
     GET  /api/matches/{id}
     POST /api/matches
     GET  /api/prediction/match/{id}
     POST /api/prediction/simulate-tournament
     GET  /api/tournament/simulate
     GET  /api/tournament/standings?group=A
     GET  /api/tournament/bracket
   If the API is unreachable, the app falls back to the same 48-team seed
   data from worldcup.sql and a client-side port of PredictionEngine.cs so
   the whole UI stays fully functional offline / during development.
   ========================================================================== */

const CONFIG = {
    API_BASE: "http://localhost:5080", // <-- must match Properties/launchSettings.json "applicationUrl" in the backend
    ENDPOINTS: {
        teams: "/api/teams",
        team: (id) => `/api/teams/${id}`,
        matches: "/api/matches",
        match: (id) => `/api/matches/${id}`,
        predictMatch: (id) => `/api/prediction/match/${id}`,
        simulateTournament: "/api/prediction/simulate-tournament",
        tournamentSimulate: "/api/tournament/simulate",
        standings: (group) => `/api/tournament/standings${group ? `?group=${group}` : ""}`,
        bracket: "/api/tournament/bracket",
        logout: "/api/logout",
        me: "/api/me",
        submitPrediction: "/api/predictions/mine",
        myPredictions: "/api/predictions/mine",
        aiPredict: (matchId) => `/api/predictions/ai-predict/${matchId}`,
        leaderboard: "/api/leaderboard",
        adminStats: "/api/admin/stats",
        login: "/api/login",
        register: "/api/register",
        users: "/api/users",
        admin: "/api/admin",
    },
    USE_LIVE_API: false, // flips to true automatically the first time a live call succeeds
};

/* ============================== SEED DATA (mirrors worldcup.sql) ============================== */
const TEAMS_SEED = [
    { id: 1, name: "Mexico", group: "A", fifaRanking: 15, attack: 2.33, defense: 0.77, form: 5, possession: 61.0, iso: "mx", confederation: "CONCACAF", titles: 0 },
    { id: 2, name: "South Korea", group: "A", fifaRanking: 25, attack: 2.21, defense: 0.89, form: 4, possession: 59.0, iso: "kr", confederation: "AFC", titles: 0 },
    { id: 3, name: "Czechia", group: "A", fifaRanking: 41, attack: 2.02, defense: 1.08, form: 4, possession: 55.0, iso: "cz", confederation: "UEFA", titles: 0 },
    { id: 4, name: "South Africa", group: "A", fifaRanking: 60, attack: 1.79, defense: 1.31, form: 4, possession: 50.0, iso: "za", confederation: "CAF", titles: 0 },
    { id: 5, name: "Switzerland", group: "B", fifaRanking: 19, attack: 2.28, defense: 0.82, form: 5, possession: 60.0, iso: "ch", confederation: "UEFA", titles: 0 },
    { id: 6, name: "Canada", group: "B", fifaRanking: 30, attack: 2.15, defense: 0.95, form: 4, possession: 58.0, iso: "ca", confederation: "CONCACAF", titles: 0 },
    { id: 7, name: "Qatar", group: "B", fifaRanking: 35, attack: 2.09, defense: 1.01, form: 4, possession: 56.0, iso: "qa", confederation: "AFC", titles: 0 },
    { id: 8, name: "Bosnia", group: "B", fifaRanking: 52, attack: 1.89, defense: 1.21, form: 4, possession: 52.0, iso: "ba", confederation: "UEFA", titles: 0 },
    { id: 9, name: "Brazil", group: "C", fifaRanking: 6, attack: 2.44, defense: 0.66, form: 5, possession: 64.0, iso: "br", confederation: "CONMEBOL", titles: 5 },
    { id: 10, name: "Morocco", group: "C", fifaRanking: 8, attack: 2.42, defense: 0.68, form: 5, possession: 63.0, iso: "ma", confederation: "CAF", titles: 0 },
    { id: 11, name: "Scotland", group: "C", fifaRanking: 47, attack: 1.95, defense: 1.15, form: 4, possession: 53.0, iso: "gb-sct", confederation: "UEFA", titles: 0 },
    { id: 12, name: "Haiti", group: "C", fifaRanking: 83, attack: 1.52, defense: 1.58, form: 3, possession: 44.0, iso: "ht", confederation: "CONCACAF", titles: 0 },
    { id: 13, name: "USA", group: "D", fifaRanking: 16, attack: 2.32, defense: 0.78, form: 5, possession: 61.0, iso: "us", confederation: "CONCACAF", titles: 0 },
    { id: 14, name: "Paraguay", group: "D", fifaRanking: 64, attack: 1.74, defense: 1.36, form: 3, possession: 49.0, iso: "py", confederation: "CONMEBOL", titles: 0 },
    { id: 15, name: "Australia", group: "D", fifaRanking: 26, attack: 2.20, defense: 0.90, form: 4, possession: 58.0, iso: "au", confederation: "AFC", titles: 0 },
    { id: 16, name: "Turkiye", group: "D", fifaRanking: 42, attack: 2.01, defense: 1.09, form: 4, possession: 54.0, iso: "tr", confederation: "UEFA", titles: 0 },
    { id: 17, name: "Germany", group: "E", fifaRanking: 10, attack: 2.39, defense: 0.71, form: 5, possession: 62.0, iso: "de", confederation: "UEFA", titles: 4 },
    { id: 18, name: "Ecuador", group: "E", fifaRanking: 24, attack: 2.22, defense: 0.88, form: 4, possession: 59.0, iso: "ec", confederation: "CONMEBOL", titles: 0 },
    { id: 19, name: "Ivory Coast", group: "E", fifaRanking: 33, attack: 2.12, defense: 0.98, form: 4, possession: 57.0, iso: "ci", confederation: "CAF", titles: 0 },
    { id: 20, name: "Curacao", group: "E", fifaRanking: 81, attack: 1.54, defense: 1.56, form: 3, possession: 45.0, iso: "cw", confederation: "CONCACAF", titles: 0 },
    { id: 21, name: "Netherlands", group: "F", fifaRanking: 7, attack: 2.43, defense: 0.67, form: 5, possession: 63.0, iso: "nl", confederation: "UEFA", titles: 0 },
    { id: 22, name: "Japan", group: "F", fifaRanking: 18, attack: 2.30, defense: 0.80, form: 5, possession: 60.0, iso: "jp", confederation: "AFC", titles: 0 },
    { id: 23, name: "Sweden", group: "F", fifaRanking: 39, attack: 2.04, defense: 1.06, form: 4, possession: 55.0, iso: "se", confederation: "UEFA", titles: 0 },
    { id: 24, name: "Tunisia", group: "F", fifaRanking: 40, attack: 2.03, defense: 1.07, form: 4, possession: 55.0, iso: "tn", confederation: "CAF", titles: 0 },
    { id: 25, name: "Belgium", group: "G", fifaRanking: 9, attack: 2.40, defense: 0.70, form: 5, possession: 63.0, iso: "be", confederation: "UEFA", titles: 0 },
    { id: 26, name: "Iran", group: "G", fifaRanking: 21, attack: 2.26, defense: 0.84, form: 4, possession: 60.0, iso: "ir", confederation: "AFC", titles: 0 },
    { id: 27, name: "Egypt", group: "G", fifaRanking: 29, attack: 2.16, defense: 0.94, form: 4, possession: 58.0, iso: "eg", confederation: "CAF", titles: 0 },
    { id: 28, name: "New Zealand", group: "G", fifaRanking: 95, attack: 1.37, defense: 1.73, form: 3, possession: 41.0, iso: "nz", confederation: "OFC", titles: 0 },
    { id: 29, name: "Spain", group: "H", fifaRanking: 2, attack: 2.49, defense: 0.61, form: 5, possession: 64.0, iso: "es", confederation: "UEFA", titles: 1 },
    { id: 30, name: "Uruguay", group: "H", fifaRanking: 17, attack: 2.31, defense: 0.79, form: 5, possession: 61.0, iso: "uy", confederation: "CONMEBOL", titles: 2 },
    { id: 31, name: "Saudi Arabia", group: "H", fifaRanking: 57, attack: 1.83, defense: 1.27, form: 4, possession: 51.0, iso: "sa", confederation: "AFC", titles: 0 },
    { id: 32, name: "Cape Verde", group: "H", fifaRanking: 70, attack: 1.67, defense: 1.43, form: 3, possession: 48.0, iso: "cv", confederation: "CAF", titles: 0 },
    { id: 33, name: "France", group: "I", fifaRanking: 1, attack: 2.50, defense: 0.60, form: 5, possession: 65.0, iso: "fr", confederation: "UEFA", titles: 2 },
    { id: 34, name: "Senegal", group: "I", fifaRanking: 14, attack: 2.34, defense: 0.76, form: 5, possession: 62.0, iso: "sn", confederation: "CAF", titles: 0 },
    { id: 35, name: "Norway", group: "I", fifaRanking: 44, attack: 1.98, defense: 1.12, form: 4, possession: 54.0, iso: "no", confederation: "UEFA", titles: 0 },
    { id: 36, name: "Iraq", group: "I", fifaRanking: 61, attack: 1.78, defense: 1.32, form: 3, possession: 50.0, iso: "iq", confederation: "AFC", titles: 0 },
    { id: 37, name: "Argentina", group: "J", fifaRanking: 3, attack: 2.48, defense: 0.62, form: 5, possession: 64.0, iso: "ar", confederation: "CONMEBOL", titles: 3 },
    { id: 38, name: "Austria", group: "J", fifaRanking: 23, attack: 2.24, defense: 0.86, form: 4, possession: 59.0, iso: "at", confederation: "UEFA", titles: 0 },
    { id: 39, name: "Algeria", group: "J", fifaRanking: 36, attack: 2.08, defense: 1.02, form: 4, possession: 56.0, iso: "dz", confederation: "CAF", titles: 0 },
    { id: 40, name: "Jordan", group: "J", fifaRanking: 68, attack: 1.70, defense: 1.40, form: 3, possession: 48.0, iso: "jo", confederation: "AFC", titles: 0 },
    { id: 41, name: "Portugal", group: "K", fifaRanking: 5, attack: 2.45, defense: 0.65, form: 5, possession: 64.0, iso: "pt", confederation: "UEFA", titles: 0 },
    { id: 42, name: "Colombia", group: "K", fifaRanking: 13, attack: 2.36, defense: 0.74, form: 5, possession: 62.0, iso: "co", confederation: "CONMEBOL", titles: 0 },
    { id: 43, name: "DR Congo", group: "K", fifaRanking: 51, attack: 1.90, defense: 1.20, form: 4, possession: 52.0, iso: "cd", confederation: "CAF", titles: 0 },
    { id: 44, name: "Uzbekistan", group: "K", fifaRanking: 62, attack: 1.77, defense: 1.33, form: 3, possession: 50.0, iso: "uz", confederation: "AFC", titles: 0 },
    { id: 45, name: "England", group: "L", fifaRanking: 4, attack: 2.46, defense: 0.64, form: 5, possession: 64.0, iso: "gb-eng", confederation: "UEFA", titles: 1 },
    { id: 46, name: "Croatia", group: "L", fifaRanking: 11, attack: 2.38, defense: 0.72, form: 5, possession: 62.0, iso: "hr", confederation: "UEFA", titles: 0 },
    { id: 47, name: "Ghana", group: "L", fifaRanking: 65, attack: 1.73, defense: 1.37, form: 3, possession: 49.0, iso: "gh", confederation: "CAF", titles: 0 },
    { id: 48, name: "Panama", group: "L", fifaRanking: 53, attack: 1.88, defense: 1.22, form: 4, possession: 52.0, iso: "pa", confederation: "CONCACAF", titles: 0 },
];

const flagUrl = (iso, size = "w160") => `https://flagcdn.com/${size}/${iso}.png`;
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

/* ============================== COUNTRIES (A-Z, ISO 3166-1 alpha-2) ============================== */
const COUNTRIES = [
    ["af", "Afghanistan"], ["al", "Albania"], ["dz", "Algeria"], ["ad", "Andorra"], ["ao", "Angola"],
    ["ag", "Antigua and Barbuda"], ["ar", "Argentina"], ["am", "Armenia"], ["au", "Australia"], ["at", "Austria"],
    ["az", "Azerbaijan"], ["bs", "Bahamas"], ["bh", "Bahrain"], ["bd", "Bangladesh"], ["bb", "Barbados"],
    ["by", "Belarus"], ["be", "Belgium"], ["bz", "Belize"], ["bj", "Benin"], ["bt", "Bhutan"],
    ["bo", "Bolivia"], ["ba", "Bosnia and Herzegovina"], ["bw", "Botswana"], ["br", "Brazil"], ["bn", "Brunei"],
    ["bg", "Bulgaria"], ["bf", "Burkina Faso"], ["bi", "Burundi"], ["cv", "Cabo Verde"], ["kh", "Cambodia"],
    ["cm", "Cameroon"], ["ca", "Canada"], ["cf", "Central African Republic"], ["td", "Chad"], ["cl", "Chile"],
    ["cn", "China"], ["co", "Colombia"], ["km", "Comoros"], ["cg", "Congo"], ["cd", "Congo (DRC)"],
    ["cr", "Costa Rica"], ["ci", "Cote d'Ivoire"], ["hr", "Croatia"], ["cu", "Cuba"], ["cw", "Curacao"],
    ["cy", "Cyprus"], ["cz", "Czechia"], ["dk", "Denmark"], ["dj", "Djibouti"], ["dm", "Dominica"],
    ["do", "Dominican Republic"], ["ec", "Ecuador"], ["eg", "Egypt"], ["sv", "El Salvador"], ["gq", "Equatorial Guinea"],
    ["er", "Eritrea"], ["ee", "Estonia"], ["sz", "Eswatini"], ["et", "Ethiopia"], ["fj", "Fiji"],
    ["fi", "Finland"], ["fr", "France"], ["ga", "Gabon"], ["gm", "Gambia"], ["ge", "Georgia"],
    ["de", "Germany"], ["gh", "Ghana"], ["gr", "Greece"], ["gd", "Grenada"], ["gt", "Guatemala"],
    ["gn", "Guinea"], ["gw", "Guinea-Bissau"], ["gy", "Guyana"], ["ht", "Haiti"], ["hn", "Honduras"],
    ["hu", "Hungary"], ["is", "Iceland"], ["in", "India"], ["id", "Indonesia"], ["ir", "Iran"],
    ["iq", "Iraq"], ["ie", "Ireland"], ["il", "Israel"], ["it", "Italy"], ["jm", "Jamaica"],
    ["jp", "Japan"], ["jo", "Jordan"], ["kz", "Kazakhstan"], ["ke", "Kenya"], ["ki", "Kiribati"],
    ["kw", "Kuwait"], ["kg", "Kyrgyzstan"], ["la", "Laos"], ["lv", "Latvia"], ["lb", "Lebanon"],
    ["ls", "Lesotho"], ["lr", "Liberia"], ["ly", "Libya"], ["li", "Liechtenstein"], ["lt", "Lithuania"],
    ["lu", "Luxembourg"], ["mg", "Madagascar"], ["mw", "Malawi"], ["my", "Malaysia"], ["mv", "Maldives"],
    ["ml", "Mali"], ["mt", "Malta"], ["mr", "Mauritania"], ["mu", "Mauritius"], ["mx", "Mexico"],
    ["md", "Moldova"], ["mc", "Monaco"], ["mn", "Mongolia"], ["me", "Montenegro"], ["ma", "Morocco"],
    ["mz", "Mozambique"], ["mm", "Myanmar"], ["na", "Namibia"], ["nr", "Nauru"], ["np", "Nepal"],
    ["nl", "Netherlands"], ["nz", "New Zealand"], ["ni", "Nicaragua"], ["ne", "Niger"], ["ng", "Nigeria"],
    ["kp", "North Korea"], ["mk", "North Macedonia"], ["no", "Norway"], ["om", "Oman"], ["pk", "Pakistan"],
    ["pw", "Palau"], ["ps", "Palestine"], ["pa", "Panama"], ["pg", "Papua New Guinea"], ["py", "Paraguay"],
    ["pe", "Peru"], ["ph", "Philippines"], ["pl", "Poland"], ["pt", "Portugal"], ["qa", "Qatar"],
    ["ro", "Romania"], ["ru", "Russia"], ["rw", "Rwanda"], ["kn", "Saint Kitts and Nevis"], ["lc", "Saint Lucia"],
    ["ws", "Samoa"], ["sm", "San Marino"], ["st", "Sao Tome and Principe"], ["sa", "Saudi Arabia"], ["sn", "Senegal"],
    ["rs", "Serbia"], ["sc", "Seychelles"], ["sl", "Sierra Leone"], ["sg", "Singapore"], ["sk", "Slovakia"],
    ["si", "Slovenia"], ["sb", "Solomon Islands"], ["so", "Somalia"], ["za", "South Africa"], ["kr", "South Korea"],
    ["ss", "South Sudan"], ["es", "Spain"], ["lk", "Sri Lanka"], ["sd", "Sudan"], ["sr", "Suriname"],
    ["se", "Sweden"], ["ch", "Switzerland"], ["sy", "Syria"], ["tw", "Taiwan"], ["tj", "Tajikistan"],
    ["tz", "Tanzania"], ["th", "Thailand"], ["tl", "Timor-Leste"], ["tg", "Togo"], ["to", "Tonga"],
    ["tt", "Trinidad and Tobago"], ["tn", "Tunisia"], ["tr", "Turkiye"], ["tm", "Turkmenistan"], ["tv", "Tuvalu"],
    ["ug", "Uganda"], ["ua", "Ukraine"], ["ae", "United Arab Emirates"], ["gb", "United Kingdom"], ["us", "United States"],
    ["uy", "Uruguay"], ["uz", "Uzbekistan"], ["vu", "Vanuatu"], ["va", "Vatican City"], ["ve", "Venezuela"],
    ["vn", "Vietnam"], ["ye", "Yemen"], ["zm", "Zambia"], ["zw", "Zimbabwe"],
].sort((a, b) => a[1].localeCompare(b[1]));

function populateCountrySelects() {
    document.querySelectorAll("select.country-select").forEach((select) => {
        const opts = COUNTRIES.map(([iso, name]) => `<option value="${iso}">${name}</option>`).join("");
        select.insertAdjacentHTML("beforeend", opts);
    });
}
function countryName(iso) {
    const hit = COUNTRIES.find((c) => c[0] === (iso || "").toLowerCase());
    return hit ? hit[1] : null;
}

/* ============================== STATE ============================== */
const STATE = {
    teams: [],
    matches: [],
    bracket: null,
    currentUser: null,
    authToken: null,
    leaderboard: [],
    page: "home",
    teamsFilter: { search: "", group: "", sort: "ranking" },
    adminSection: "dashboard",
    bracketStage: "R32",
};

/* ============================== CLIENT-SIDE PREDICTION ENGINE ==============================
   Faithful JS port of Services/PredictionEngine.cs so predictions look identical
   in behaviour whether they come from the live API or the offline fallback. */
const PredictionEngine = (() => {
    const MaxFifaRank = 211.0;
    const MaxGoalsPerMatch = 3.0;
    const MaxConcededPerMatch = 3.0;
    const RankingWeight = 0.30, FormWeight = 0.25, AttackWeight = 0.20, DefenseWeight = 0.15, PossessionWeight = 0.10;
    const MinWinShare = 0.12;
    const BigUpsetChance = 0.12;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const rnd = () => Math.random();
    const rndInt = (min, max) => Math.floor(rnd() * (max - min)) + min; // [min, max)

    function aiScore(team) {
        const rankingScore = clamp01((MaxFifaRank - team.fifaRanking) / 210.0);
        const formScore = clamp01(team.form / 5.0);
        const attackScore = clamp01(team.attack / MaxGoalsPerMatch);
        const defenseScore = clamp01(1.0 - (team.defense / MaxConcededPerMatch));
        const possessionScore = clamp01(team.possession / 100.0);
        return +(
            rankingScore * RankingWeight + formScore * FormWeight + attackScore * AttackWeight +
            defenseScore * DefenseWeight + possessionScore * PossessionWeight
        ).toFixed(4);
    }

    function predictMatch(teamA, teamB, allowDraw) {
        const scoreA = aiScore(teamA), scoreB = aiScore(teamB);
        const diff = scoreA - scoreB, absDiff = Math.abs(diff);

        let drawProbability = allowDraw ? clamp(0.28 - absDiff * 1.2, 0.06, 0.28) : 0.0;
        const LogisticSlope = 6.0;
        let splitA = 1.0 / (1.0 + Math.exp(-diff * LogisticSlope));
        splitA = clamp(splitA, MinWinShare, 1 - MinWinShare);

        let winProbabilityA = +((1 - drawProbability) * splitA).toFixed(4);
        let winProbabilityB = +((1 - drawProbability) * (1 - splitA)).toFixed(4);
        drawProbability = +(1 - winProbabilityA - winProbabilityB).toFixed(4);

        const roll = rnd();
        const isDraw = allowDraw && roll < drawProbability;
        const aWins = !isDraw && roll < drawProbability + winProbabilityA;

        let scA, scB, decidedByPenalties = false, winnerId;

        if (isDraw) {
            const nilNil = absDiff < 0.06 && rndInt(0, 2) === 0;
            const goals = nilNil ? 0 : 1;
            scA = goals; scB = goals; winnerId = null;
        } else {
            const favoriteWon = (aWins && diff >= 0) || (!aWins && diff < 0);
            let winnerGoals, loserGoals;
            if (favoriteWon) {
                if (absDiff >= 0.15) { winnerGoals = 3; loserGoals = rndInt(0, 2); }
                else if (absDiff >= 0.08) { winnerGoals = 2; loserGoals = 1; }
                else { winnerGoals = rndInt(0, 2) === 0 ? 1 : 2; loserGoals = 1; }
            } else {
                const bigUpset = rnd() < BigUpsetChance;
                winnerGoals = bigUpset ? rndInt(2, 4) : 1;
                loserGoals = bigUpset ? rndInt(0, 2) : 0;
                if (winnerGoals <= loserGoals) winnerGoals = loserGoals + 1;
            }
            if (aWins) { scA = winnerGoals; scB = loserGoals; winnerId = teamA.id; }
            else { scB = winnerGoals; scA = loserGoals; winnerId = teamB.id; }
        }

        if (!allowDraw && scA === scB) {
            decidedByPenalties = true;
            const penaltyEdgeA = 0.5 + clamp(diff * 0.5, -0.1, 0.1);
            winnerId = rnd() < penaltyEdgeA ? teamA.id : teamB.id;
        }

        return {
            teamAId: teamA.id, teamAName: teamA.name, teamBId: teamB.id, teamBName: teamB.name,
            aiScoreA: scoreA, aiScoreB: scoreB,
            winProbabilityA, winProbabilityB, drawProbability,
            predictedWinnerId: winnerId,
            predictedScoreA: scA, predictedScoreB: scB,
            decidedByPenalties,
        };
    }

    return { aiScore, predictMatch };
})();

/* ============================== REAL 2026 WORLD CUP RESULTS ==============================
   The actual final group-stage standings from the real tournament (group stage completed
   28 June 2026), used as-is instead of simulating results. Stats: [wins, draws, losses, gf, ga].
   `qualified` marks the real teams that actually advanced (top 2 automatically, plus the
   real 8 best third-placed teams across the whole tournament). */
const REAL_GROUP_RESULTS = {
    A: [["Mexico", 3, 0, 0, 6, 0], ["South Africa", 1, 1, 1, 2, 3], ["South Korea", 1, 0, 2, 2, 3], ["Czechia", 0, 1, 2, 2, 6]],
    B: [["Switzerland", 2, 1, 0, 7, 3], ["Canada", 1, 1, 1, 8, 3], ["Bosnia", 1, 1, 1, 5, 6], ["Qatar", 0, 1, 2, 2, 10]],
    C: [["Brazil", 2, 1, 0, 7, 1], ["Morocco", 2, 1, 0, 6, 3], ["Scotland", 1, 0, 2, 1, 4], ["Haiti", 0, 0, 3, 2, 8]],
    D: [["USA", 2, 0, 1, 8, 4], ["Australia", 1, 1, 1, 2, 2], ["Paraguay", 1, 1, 1, 2, 4], ["Turkiye", 1, 0, 2, 3, 5]],
    E: [["Germany", 2, 0, 1, 10, 4], ["Ivory Coast", 2, 0, 1, 4, 2], ["Ecuador", 1, 1, 1, 2, 2], ["Curacao", 0, 1, 2, 1, 9]],
    F: [["Netherlands", 2, 1, 0, 10, 4], ["Japan", 1, 2, 0, 7, 3], ["Sweden", 1, 1, 1, 7, 7], ["Tunisia", 0, 0, 3, 2, 12]],
    G: [["Belgium", 1, 2, 0, 6, 2], ["Egypt", 1, 2, 0, 5, 3], ["Iran", 0, 3, 0, 3, 3], ["New Zealand", 0, 1, 2, 4, 10]],
    H: [["Spain", 2, 1, 0, 5, 0], ["Cape Verde", 0, 3, 0, 2, 2], ["Uruguay", 0, 2, 1, 3, 3], ["Saudi Arabia", 0, 1, 2, 1, 5]],
    I: [["France", 3, 0, 0, 10, 2], ["Norway", 2, 0, 1, 8, 7], ["Senegal", 1, 0, 2, 8, 6], ["Iraq", 0, 0, 3, 1, 12]],
    J: [["Argentina", 3, 0, 0, 8, 1], ["Austria", 1, 1, 1, 6, 6], ["Algeria", 1, 1, 1, 5, 7], ["Jordan", 0, 0, 3, 3, 8]],
    K: [["Colombia", 2, 1, 0, 4, 1], ["Portugal", 1, 2, 0, 6, 1], ["DR Congo", 1, 1, 1, 4, 3], ["Uzbekistan", 0, 0, 3, 2, 11]],
    L: [["England", 2, 1, 0, 6, 2], ["Croatia", 2, 0, 1, 5, 5], ["Ghana", 1, 1, 1, 2, 2], ["Panama", 0, 0, 3, 0, 4]],
};
// The real 8 groups whose 3rd-placed team actually qualified as one of the tournament's best third-place teams.
const REAL_QUALIFIED_THIRDS = new Set(["B", "D", "E", "F", "I", "J", "K", "L"]);

/* The real, actual Round of 32 fixture list exactly as played, ordered so that consecutive
   pairs (0,1) (2,3) ... feed correctly into the real Round of 16 pairings (per the official
   FIFA schedule: e.g. South Africa/Canada winner meets Netherlands/Morocco winner on July 4). */
const REAL_R32_MATCHES = [
    { a: "South Africa", b: "Canada", date: "Sun Jun 28", venue: "SoFi Stadium, Inglewood" },
    { a: "Netherlands", b: "Morocco", date: "Mon Jun 29", venue: "Estadio BBVA, Monterrey" },
    { a: "Germany", b: "Paraguay", date: "Mon Jun 29", venue: "Gillette Stadium, Foxborough" },
    { a: "France", b: "Sweden", date: "Tue Jun 30", venue: "MetLife Stadium, East Rutherford" },
    { a: "Brazil", b: "Japan", date: "Mon Jun 29", venue: "NRG Stadium, Houston" },
    { a: "Ivory Coast", b: "Norway", date: "Tue Jun 30", venue: "AT&T Stadium, Arlington" },
    { a: "Mexico", b: "Ecuador", date: "Tue Jun 30", venue: "Estadio Azteca, Mexico City" },
    { a: "England", b: "DR Congo", date: "Wed Jul 1", venue: "Mercedes-Benz Stadium, Atlanta" },
    { a: "Spain", b: "Austria", date: "Thu Jul 2", venue: "SoFi Stadium, Inglewood" },
    { a: "Portugal", b: "Croatia", date: "Thu Jul 2", venue: "BMO Field, Toronto" },
    { a: "Belgium", b: "Senegal", date: "Wed Jul 1", venue: "Lumen Field, Seattle" },
    { a: "USA", b: "Bosnia", date: "Wed Jul 1", venue: "Levi's Stadium, Santa Clara" },
    { a: "Australia", b: "Egypt", date: "Fri Jul 3", venue: "AT&T Stadium, Arlington" },
    { a: "Argentina", b: "Cape Verde", date: "Fri Jul 3", venue: "Hard Rock Stadium, Miami Gardens" },
    { a: "Switzerland", b: "Algeria", date: "Thu Jul 2", venue: "BC Place, Vancouver" },
    { a: "Colombia", b: "Ghana", date: "Fri Jul 3", venue: "Arrowhead Stadium, Kansas City" },
];

/* Loads the real final group standings (already known — the group stage is complete) into
   STATE.groupStandings, in the same shape the Groups tab and bracket builder expect. */
function simulateGroupStage() {
    const standings = {};
    GROUPS.forEach((g) => {
        const rows = REAL_GROUP_RESULTS[g].map(([name, w, d, l, gf, ga]) => {
            const team = STATE.teams.find((t) => t.name === name);
            return { team, played: w + d + l, won: w, draw: d, lost: l, gf, ga, gd: gf - ga, pts: w * 3 + d };
        });
        rows.forEach((row, idx) => { row.position = idx + 1; });
        standings[g] = rows;
    });
    STATE.groupStandings = standings;

    const thirds = GROUPS.map((g) => ({ group: g, ...standings[g][2], qualified: REAL_QUALIFIED_THIRDS.has(g) }));
    STATE.thirdPlaceTable = thirds;
    return standings;
}

/* ============================== API LAYER (with graceful fallback) ============================== */
function authHeaders(extra = {}) {
    return STATE.authToken ? { ...extra, Authorization: `Bearer ${STATE.authToken}` } : extra;
}
async function apiGet(path) {
    const res = await fetch(CONFIG.API_BASE + path, { headers: authHeaders({ Accept: "application/json" }) });
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
}
async function apiPost(path, body) {
    const res = await fetch(CONFIG.API_BASE + path, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
}

async function loadTeams() {
    try {
        const data = await apiGet(CONFIG.ENDPOINTS.teams);
        CONFIG.USE_LIVE_API = true;
        STATE.teams = data.map(normalizeTeamFromApi);
    } catch (e) {
        STATE.teams = TEAMS_SEED.slice();
    }
    return STATE.teams;
}

/* Makes it obvious, at a glance, whether the app is actually talking to the backend or
   running on offline seed data — instead of an empty leaderboard looking the same either way. */
function showBackendStatusBanner() {
    const el = document.getElementById("backend-status-banner");
    if (!el) return;
    if (CONFIG.USE_LIVE_API) {
        el.className = "online";
        el.textContent = `Connected to backend at ${CONFIG.API_BASE} — real picks, grading, and leaderboard are live.`;
        el.style.display = "block";
        setTimeout(() => { el.style.display = "none"; }, 4000); // don't nag once we know it's fine
    } else {
        el.className = "offline";
        el.textContent = `Can't reach the backend at ${CONFIG.API_BASE} — running in offline demo mode. Picks won't be saved or graded, and the leaderboard will stay empty until the backend is connected.`;
        el.style.display = "block"; // stays up — this matters
    }
}

function normalizeTeamFromApi(t) {
    const seedMeta = TEAMS_SEED.find((s) => s.name === t.name) || {};
    return {
        id: t.id, name: t.name, group: t.group ?? t.Group, fifaRanking: t.fifaRanking ?? t.FifaRanking,
        attack: t.attackRating ?? t.AttackRating ?? seedMeta.attack,
        defense: t.defenseRating ?? t.DefenseRating ?? seedMeta.defense,
        form: t.form ?? t.Form ?? seedMeta.form,
        possession: t.possession ?? t.Possession ?? seedMeta.possession,
        iso: seedMeta.iso || "un", confederation: seedMeta.confederation || "—", titles: seedMeta.titles || 0,
    };
}

function teamById(id) { return STATE.teams.find((t) => t.id === id); }

/* ============================== APP INIT ============================== */
document.addEventListener("DOMContentLoaded", init);

// Failsafe: no matter what breaks below, never leave the user staring at the
// loading screen forever. This timer is independent of init()'s success.
setTimeout(hideLoader, 6000);

// Runs a step in isolation so one failure (e.g. a CDN script blocked by the
// network/ad-blocker) can't stop the rest of the app from initializing.
function safeStep(name, fn) {
    try { fn(); } catch (err) { console.error(`[init] "${name}" failed:`, err); }
}

async function init() {
    try {
        await loadTeams();
    } catch (err) {
        console.error("[init] loadTeams failed, using offline seed data:", err);
        STATE.teams = TEAMS_SEED.slice();
    }

    safeStep("restoreSession", restoreSession);
    safeStep("showBackendStatusBanner", showBackendStatusBanner);
    safeStep("renderDashboard", renderDashboard);
    safeStep("renderTeams", renderTeams);
    safeStep("renderGroups", renderGroups);
    safeStep("buildBracketFromGroups", buildBracketFromGroups);
    safeStep("renderBracket", renderBracket);
    safeStep("renderCharts", renderCharts); // depends on the Chart.js CDN — isolated on purpose
    safeStep("wireNav", wireNav);
    safeStep("wireHero", wireHero);
    safeStep("wireModals", wireModals);
    safeStep("wireAdmin", wireAdmin);
    safeStep("wireMisc", wireMisc);
    safeStep("observeReveal", observeReveal);
    safeStep("populateCountrySelects", populateCountrySelects);
    safeStep("wireAvatarUploads", wireAvatarUploads);
    safeStep("wireEditProfile", wireEditProfile);

    try { await loadLeaderboard(); } catch (err) { console.error("[init] loadLeaderboard failed:", err); }
    safeStep("renderLeaderboard", renderLeaderboard);

    if (STATE.authToken && CONFIG.USE_LIVE_API) {
        try { await ensureRoundOf32MatchIds(); } catch (err) { console.error("[init] ensureRoundOf32MatchIds failed:", err); }
    }

    setTimeout(hideLoader, 400);
}

function hideLoader() {
    document.getElementById("loading-screen").classList.add("hidden");
}

/* ============================== NAV / ROUTING ============================== */
function wireNav() {
    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 20);
    });

    document.querySelectorAll("[data-page]").forEach((el) => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            goToPage(el.dataset.page);
            document.getElementById("nav-links").classList.remove("open");
        });
    });

    document.getElementById("nav-toggle").addEventListener("click", () => {
        document.getElementById("nav-links").classList.toggle("open");
    });
}

function goToPage(page) {
    STATE.page = page;
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav-links a").forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "admin") renderAdmin();
    if (page === "profile") renderProfile();
    if (page === "leaderboard") { loadLeaderboard().then(() => renderLeaderboard(document.getElementById("lb-search")?.value || "")); }
    if (page === "predictor") { updatePredictionCounter(); loadLeaderboard().then(updatePredictionCounter); }
}
window.goToPage = goToPage;

function wireHero() {
    const particleWrap = document.getElementById("hero-particles");
    for (let i = 0; i < 34; i++) {
        const p = document.createElement("span");
        p.className = "particle";
        const size = 2 + Math.random() * 4;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDuration = `${8 + Math.random() * 10}s`;
        p.style.animationDelay = `${Math.random() * 10}s`;
        particleWrap.appendChild(p);
    }
    animateCounters();
}

function animateCounters() {
    document.querySelectorAll("[data-counter]").forEach((el) => {
        const target = +el.dataset.counter;
        let cur = 0;
        const step = Math.max(1, Math.round(target / 60));
        const tick = () => {
            cur += step;
            if (cur >= target) { el.textContent = target; return; }
            el.textContent = cur;
            requestAnimationFrame(tick);
        };
        tick();
    });
}

function observeReveal() {
    const items = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); }
        });
    }, { threshold: 0.12 });
    items.forEach((it) => io.observe(it));
}

/* ============================== DASHBOARD ============================== */
function renderDashboard() {
    document.getElementById("dash-teams").textContent = STATE.teams.length || 48;
    document.getElementById("dash-groups").textContent = 12;
    document.getElementById("dash-matches").textContent = 104;
    const champ = STATE.bracket?.champion;
    document.getElementById("dash-champion").textContent = champ ? champ.name : "TBD";
    document.getElementById("dash-stage").textContent = "Group Stage";
}

/* ============================== TEAMS SECTION ============================== */
function renderTeams() {
    const grid = document.getElementById("teams-grid");
    const { search, group, sort } = STATE.teamsFilter;

    let list = STATE.teams.filter((t) => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
        const matchesGroup = !group || t.group === group;
        return matchesSearch && matchesGroup;
    });

    list = list.slice().sort((a, b) => {
        if (sort === "ranking") return a.fifaRanking - b.fifaRanking;
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "group") return a.group.localeCompare(b.group);
        if (sort === "attack") return b.attack - a.attack;
        return 0;
    });

    if (!list.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-magnifying-glass"></i><p>No teams match your search.</p></div>`;
        return;
    }

    grid.innerHTML = list.map((t) => `
    <div class="glass team-card reveal visible" data-team-id="${t.id}">
      <span class="qualified-badge" title="Qualified"><i class="fa-solid fa-check"></i></span>
      <div class="team-flag-wrap"><img src="${flagUrl(t.iso)}" alt="${t.name} flag" loading="lazy"></div>
      <h4>${t.name}</h4>
      <span class="team-group-pill">Group ${t.group}</span>
      <div class="team-meta">
        <div><b>#${t.fifaRanking}</b>FIFA Rank</div>
        <div><b>${t.confederation}</b>Confed.</div>
        <div><b>${t.titles}</b>Titles</div>
      </div>
    </div>
  `).join("");

    grid.querySelectorAll(".team-card").forEach((card) => {
        card.addEventListener("click", () => openTeamPreview(+card.dataset.teamId));
    });
}

function openTeamPreview(id) {
    const t = teamById(id);
    if (!t) return;
    showToast(`${t.name} — AI Score ${PredictionEngine.aiScore(t)} · Attack ${t.attack} · Defense ${t.defense}`, "success");
}

function wireTeamsToolbar() {
    const searchInput = document.getElementById("team-search");
    const groupSelect = document.getElementById("team-group-filter");
    const sortSelect = document.getElementById("team-sort");

    GROUPS.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g; opt.textContent = `Group ${g}`;
        groupSelect.appendChild(opt);
    });

    searchInput.addEventListener("input", (e) => { STATE.teamsFilter.search = e.target.value; renderTeams(); });
    groupSelect.addEventListener("change", (e) => { STATE.teamsFilter.group = e.target.value; renderTeams(); });
    sortSelect.addEventListener("change", (e) => { STATE.teamsFilter.sort = e.target.value; renderTeams(); });
}

/* ============================== GROUPS SECTION ============================== */
function renderGroups() {
    if (!STATE.groupStandings) simulateGroupStage();
    const wrap = document.getElementById("groups-grid");
    wrap.innerHTML = GROUPS.map((g) => {
        const table = STATE.groupStandings[g];
        const rows = table.map((row) => {
            const idx = row.position - 1;
            const t = row.team;
            const gd = row.gd > 0 ? `+${row.gd}` : `${row.gd}`;
            const gdClass = row.gd < 0 ? "gd-neg" : "gd-pos";
            const thirdQualified = idx === 2 && STATE.thirdPlaceTable.find((r) => r.group === g)?.qualified;
            const qualifyClass = idx < 2 ? "qualify" : (thirdQualified ? "qualify" : "");
            return `
      <tr>
        <td><span class="pos-tag ${qualifyClass}">${row.position}</span></td>
        <td>
          <div class="team-cell"><img src="${flagUrl(t.iso, "w40")}" alt="${t.name}"> ${t.name}</div>
        </td>
        <td>#${t.fifaRanking}</td>
        <td>${row.played}</td>
        <td class="${gdClass}">${gd}</td>
        <td><strong>${row.pts}</strong></td>
      </tr>`;
        }).join("");

        return `
    <div class="glass group-card reveal">
      <div class="group-head"><h3>Group ${g}</h3><span>4 Teams</span></div>
      <table class="group-table">
        <thead><tr><th>#</th><th>Team</th><th>Rank</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    }).join("");
}

/* ============================== PREDICTOR / BRACKET ============================== */
const STAGE_ORDER = ["R32", "R16", "QF", "SF", "F"];
const STAGE_LABEL = { R32: "Round of 32", R16: "Round of 16", QF: "Quarter-Finals", SF: "Semi-Finals", F: "Final" };

function buildBracketFromGroups() {
    // Uses the real, already-known final group standings and slots the real 32 teams that
    // actually qualified into the real Round of 32 fixture list exactly as it was played.
    if (!STATE.groupStandings) simulateGroupStage();
    const findTeam = (name) => STATE.teams.find((t) => t.name === name);

    const r32 = REAL_R32_MATCHES.map((fx, idx) => {
        const teamA = findTeam(fx.a);
        const teamB = findTeam(fx.b);
        const subtitle = `${fx.date} · ${fx.venue}`;
        return { id: `R32-${idx}`, subtitle, teamA, teamB, winner: null, scoreA: null, scoreB: null, penalties: false, userPick: null, pickWasCorrect: null };
    });

    STATE.bracket = { R32: r32, R16: buildEmptyRound(8, "R16"), QF: buildEmptyRound(4, "QF"), SF: buildEmptyRound(2, "SF"), F: buildEmptyRound(1, "F"), champion: null };
}
function buildEmptyRound(n, prefix) {
    return Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, teamA: null, teamB: null, winner: null, scoreA: null, scoreB: null, penalties: false, userPick: null, pickWasCorrect: null }));
}

/* Records the user's OWN guess for who wins this match. This is just a pick — it does NOT
   decide the match, does NOT advance the bracket, and isn't graded yet. Only pressing
   "AI Predict" (resolveMatchWithAI) actually resolves a match and grades this pick. */
function selectPick(stage, matchIdx, team) {
    if (!requireLogin("make a prediction")) return;
    const match = STATE.bracket[stage][matchIdx];
    if (!match.teamA || !match.teamB || match.winner) return; // locked once the AI has resolved it
    match.userPick = team;
    renderBracket();
    renderDashboard();
    showToast(`Pick saved: ${team.name} to win. Press "AI Predict" when you're ready to see if you're right.`, "success");
    return savePickToBackend(stage, matchIdx, match);
}

/* Blocks an action and prompts login when nobody's signed in. Every route into predicting
   (picking a team, "AI Predict", "Simulate Full Tournament") funnels through this, so gating
   here covers all of them from a single choke point. */
function requireLogin(actionLabel) {
    if (STATE.currentUser) return true;
    showToast(`Please log in to ${actionLabel}.`, "error");
    openModal("login-modal");
    return false;
}

const STAGE_NUM = { R32: 1, R16: 2, QF: 3, SF: 4, F: 5 };
const STAGE_QUERY_NAME = { R32: "RoundOf32", R16: "RoundOf16", QF: "QuarterFinal", SF: "SemiFinal", F: "Final" };

/* Makes sure a real backend Match row exists for this bracket slot (any stage — Round of 32
   through the Final), creating it the first time it's needed so a user's pick can be POSTed to
   /api/predictions/mine with a real MatchId. Caches the id on the bracket match object. */
async function ensureBackendMatchId(stage, matchIdx) {
    const match = STATE.bracket[stage]?.[matchIdx];
    if (!CONFIG.USE_LIVE_API || !match || !match.teamA || !match.teamB) return null;
    if (match.backendMatchId) return match.backendMatchId;
    try {
        const existing = await apiGet(`${CONFIG.ENDPOINTS.matches}?stage=${STAGE_QUERY_NAME[stage]}`);
        const hit = existing.find((m) =>
            (m.teamAName === match.teamA.name && m.teamBName === match.teamB.name) ||
            (m.teamAName === match.teamB.name && m.teamBName === match.teamA.name));
        if (hit) { match.backendMatchId = hit.id; return hit.id; }
        const created = await apiPost(CONFIG.ENDPOINTS.matches, {
            teamAId: match.teamA.id, teamBId: match.teamB.id,
            stage: STAGE_NUM[stage], groupName: null,
        });
        match.backendMatchId = created.id;
        return created.id;
    } catch (e) {
        console.warn(`[matches] could not sync ${stage}-${matchIdx} with backend:`, e);
        return null;
    }
}

/* Stores the user's pick in MySQL via the backend so it's there waiting to be graded once the
   AI resolves this match. NOT graded here — IsCorrect/PointsAwarded stay null/0 until
   /api/predictions/ai-predict/{matchId} runs. Silently no-ops if not logged in or offline. */
async function savePickToBackend(stage, matchIdx, match) {
    if (!STATE.authToken || !CONFIG.USE_LIVE_API) return null;
    const backendMatchId = await ensureBackendMatchId(stage, matchIdx);
    if (!backendMatchId) return null;
    try {
        await apiPost(CONFIG.ENDPOINTS.submitPrediction, {
            matchId: backendMatchId,
            predictedWinnerId: match.userPick.id,
            predictedScoreA: null,
            predictedScoreB: null,
        });
        updatePredictionCounter();
        return true;
    } catch (err) {
        console.warn("[predictions] failed to save pick to backend:", err);
        return null;
    }
}

/* THE ONLY thing that decides a match's outcome — never the user's own click. Calls the
   backend's single canonical AI prediction for this match (computed once, cached forever), sets
   the real winner/score from THAT, advances the bracket, and grades whatever pick the user saved
   earlier (if any) against it. Falls back to a clearly-labeled local demo mode when offline. */
async function resolveMatchWithAI(stage, matchIdx) {
    if (!requireLogin("let the AI predict this match")) return;
    const match = STATE.bracket[stage][matchIdx];
    if (!match.teamA || !match.teamB || match.winner) return;

    if (STATE.authToken && CONFIG.USE_LIVE_API) {
        const backendMatchId = await ensureBackendMatchId(stage, matchIdx);
        if (!backendMatchId) { resolveMatchLocally(stage, matchIdx); return; }
        try {
            const res = await apiPost(CONFIG.ENDPOINTS.aiPredict(backendMatchId));
            applyAiResult(stage, matchIdx, res);
        } catch (err) {
            console.warn("[ai-predict] failed, falling back to local demo engine:", err);
            resolveMatchLocally(stage, matchIdx);
        }
    } else {
        resolveMatchLocally(stage, matchIdx);
    }
}

/* Applies the backend's canonical AI result to a bracket match and grades the user's pick. */
function applyAiResult(stage, matchIdx, res) {
    const match = STATE.bracket[stage][matchIdx];
    const winnerTeam = res.predictedWinnerId === match.teamA.id ? match.teamA : match.teamB;
    match.winner = winnerTeam;
    match.scoreA = res.predictedScoreA;
    match.scoreB = res.predictedScoreB;
    match.penalties = res.decidedByPenalties;
    match.pickWasCorrect = res.yourPickTeamId == null ? null : res.yourPickIsCorrect;
    propagateWinner(stage, matchIdx, winnerTeam);
    renderBracket();
    renderDashboard();

    if (res.yourPickTeamId == null) {
        showToast(`AI predicts ${winnerTeam.name} ${res.predictedScoreA}-${res.predictedScoreB}${res.decidedByPenalties ? " (pens)" : ""}. You didn't make a pick for this match.`, "success");
    } else if (res.yourPickIsCorrect) {
        showToast(`Correct! The AI also picked ${winnerTeam.name} (${res.predictedScoreA}-${res.predictedScoreB}) — +${res.yourPickPointsAwarded} points.`, "success");
    } else {
        showToast(`Not this time — the AI predicts ${winnerTeam.name} ${res.predictedScoreA}-${res.predictedScoreB}. 0 points for this pick.`, "error");
    }

    loadLeaderboard().then(() => {
        if (STATE.page === "leaderboard") renderLeaderboard(document.getElementById("lb-search")?.value || "");
        if (STATE.page === "profile") renderProfile();
    });
}

/* Offline / no-backend fallback so the demo still works without a live API connection. Clearly
   labeled as such since it can't produce real, server-graded leaderboard points. */
function resolveMatchLocally(stage, matchIdx) {
    const match = STATE.bracket[stage][matchIdx];
    const pred = PredictionEngine.predictMatch(match.teamA, match.teamB, false);
    const winnerTeam = pred.predictedWinnerId === match.teamA.id ? match.teamA : match.teamB;
    match.winner = winnerTeam;
    match.scoreA = pred.predictedScoreA;
    match.scoreB = pred.predictedScoreB;
    match.penalties = pred.decidedByPenalties;
    match.pickWasCorrect = match.userPick ? match.userPick.id === winnerTeam.id : null;
    propagateWinner(stage, matchIdx, winnerTeam);
    renderBracket();
    renderDashboard();

    const offlineNote = "(Offline demo — connect the backend for real leaderboard points.)";
    if (!match.userPick) {
        showToast(`AI predicts ${winnerTeam.name} ${match.scoreA}-${match.scoreB}${match.penalties ? " (pens)" : ""}. ${offlineNote}`, "success");
    } else if (match.pickWasCorrect) {
        showToast(`Correct! The AI also picked ${winnerTeam.name}. ${offlineNote}`, "success");
    } else {
        showToast(`Not this time — the AI predicts ${winnerTeam.name} ${match.scoreA}-${match.scoreB}. ${offlineNote}`, "error");
    }
}

function propagateWinner(stage, matchIdx, winnerTeam) {
    const stageIdx = STAGE_ORDER.indexOf(stage);
    if (stageIdx === STAGE_ORDER.length - 1) {
        STATE.bracket.champion = winnerTeam;
        return;
    }
    const nextStage = STAGE_ORDER[stageIdx + 1];
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const nextMatch = STATE.bracket[nextStage][nextMatchIdx];
    const slot = matchIdx % 2 === 0 ? "teamA" : "teamB";
    nextMatch[slot] = winnerTeam;
    // Clear anything downstream since a slot changed
    nextMatch.winner = null; nextMatch.scoreA = null; nextMatch.scoreB = null;
    nextMatch.userPick = null; nextMatch.pickWasCorrect = null; nextMatch.backendMatchId = null;
    clearDownstream(nextStage, nextMatchIdx);
}
function clearDownstream(stage, matchIdx) {
    const stageIdx = STAGE_ORDER.indexOf(stage);
    if (stageIdx === STAGE_ORDER.length - 1) { STATE.bracket.champion = null; return; }
    const nextStage = STAGE_ORDER[stageIdx + 1];
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const nextMatch = STATE.bracket[nextStage][nextMatchIdx];
    const slot = matchIdx % 2 === 0 ? "teamA" : "teamB";
    if (nextMatch[slot]) {
        nextMatch[slot] = null; nextMatch.winner = null; nextMatch.scoreA = null; nextMatch.scoreB = null;
        nextMatch.userPick = null; nextMatch.pickWasCorrect = null; nextMatch.backendMatchId = null;
        clearDownstream(nextStage, nextMatchIdx);
    }
}

/* Counts every match across all knockout rounds that currently has both teams known, so the
   "X / Y matches" total reflects only picks that are actually possible right now (later rounds
   fill in as earlier ones are decided). Picks-made comes straight from STATE.bracket winners,
   which stays in lockstep with what's been POSTed to /api/predictions/mine. */
function updatePredictionCounter() {
    const countEl = document.getElementById("predictor-pick-count");
    const totalEl = document.getElementById("predictor-pick-total");
    const pointsEl = document.getElementById("predictor-points-summary");
    if (!countEl || !STATE.bracket) return;

    let made = 0, possible = 0;
    for (const stage of STAGE_ORDER) {
        for (const m of STATE.bracket[stage]) {
            if (!m.teamA || !m.teamB) continue;
            possible++;
            if (m.userPick) made++;
        }
    }
    countEl.textContent = made;
    totalEl.textContent = possible;

    if (pointsEl) {
        if (!STATE.currentUser) {
            pointsEl.textContent = "";
        } else if (STATE.authToken && CONFIG.USE_LIVE_API) {
            const mineEntry = STATE.leaderboard.find((r) => (r.user || "").toLowerCase() === (STATE.currentUser.username || "").toLowerCase());
            pointsEl.textContent = mineEntry ? `${mineEntry.points} pts so far` : "";
        } else {
            pointsEl.textContent = "Connect the backend to save picks and earn real points.";
        }
    }
}

function renderBracket() {
    const wrap = document.getElementById("bracket-wrap");
    const stages = STAGE_ORDER;
    wrap.innerHTML = `<div class="bracket">` + stages.map((stage) => {
        const matches = STATE.bracket[stage];
        return `
    <div class="bracket-round">
      <div class="bracket-round-title">${STAGE_LABEL[stage]}</div>
      ${matches.map((m, idx) => matchCardHtml(stage, idx, m)).join("")}
    </div>`;
    }).join("") + `</div>`;

    wrap.querySelectorAll("[data-pick]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const [stage, idx, side] = btn.dataset.pick.split("|");
            const match = STATE.bracket[stage][+idx];
            const team = side === "A" ? match.teamA : match.teamB;
            selectPick(stage, +idx, team);
        });
    });

    const champWrap = document.getElementById("champion-wrap");
    if (STATE.bracket.champion) {
        const c = STATE.bracket.champion;
        champWrap.innerHTML = `
      <div class="glass champion-card">
        <i class="fa-solid fa-trophy trophy"></i>
        <img src="${flagUrl(c.iso)}" alt="${c.name}">
        <h3>${c.name}</h3>
        <span>Predicted World Champion</span>
      </div>`;
    } else {
        champWrap.innerHTML = "";
    }

    updatePredictionCounter();
}

function matchCardHtml(stage, idx, m) {
    const teamRow = (team, side) => {
        if (!team) return `<div class="match-team tbd"><div class="team-flag-wrap" style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.06)"></div><span class="team-name">TBD</span></div>`;
        const isWinner = m.winner && m.winner.id === team.id;
        const isPicked = !m.winner && m.userPick && m.userPick.id === team.id;
        const canPick = team && !m.winner;
        const score = m.winner ? (side === "A" ? m.scoreA : m.scoreB) : "";
        return `
      <div class="match-team ${isWinner ? "winner" : ""} ${isPicked ? "picked" : ""}" ${canPick ? `data-pick="${stage}|${idx}|${side}"` : ""} style="${canPick ? "cursor:pointer" : ""}">
        <img src="${flagUrl(team.iso, "w40")}" alt="${team.name}">
        <span class="team-name">${team.name}${isPicked ? ' <i class="fa-solid fa-star pick-star" title="Your pick"></i>' : ""}</span>
        <span class="team-score">${score}</span>
      </div>`;
    };
    const metaLabel = m.subtitle ? m.subtitle : `Match ${stage}-${idx + 1}`;
    let resultTag = "";
    if (m.winner) {
        if (m.pickWasCorrect === true) resultTag = `<span class="pick-result-tag correct"><i class="fa-solid fa-check"></i> Your pick was right</span>`;
        else if (m.pickWasCorrect === false) resultTag = `<span class="pick-result-tag wrong"><i class="fa-solid fa-xmark"></i> Your pick was wrong</span>`;
        else resultTag = `<span class="pick-result-tag none">You didn't pick this one</span>`;
    }
    return `
  <div class="glass match-card">
    <div class="match-meta-row"><span>${metaLabel}</span>${m.penalties ? '<span class="penalty-tag">Pens</span>' : ""}</div>
    ${teamRow(m.teamA, "A")}
    <div class="match-vs-divider"></div>
    ${teamRow(m.teamB, "B")}
    ${!m.winner && m.teamA && m.teamB ? `<div class="match-footer"><button class="btn btn-outline btn-sm" data-simulate="${stage}|${idx}"><i class="fa-solid fa-bolt"></i> AI Predict</button></div>` : ""}
    ${resultTag ? `<div class="match-meta-row" style="margin-top:8px;margin-bottom:0;">${resultTag}</div>` : ""}
  </div>`;
}

function wireBracketToolbar() {
    document.getElementById("bracket-wrap").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-simulate]");
        if (!btn) return;
        const [stage, idx] = btn.dataset.simulate.split("|");
        resolveMatchWithAI(stage, +idx);
    });

    document.getElementById("simulate-tournament-btn").addEventListener("click", async () => {
        if (!requireLogin("let the AI predict the rest of the tournament")) return;
        showToast("Running the AI across every remaining match…", "success");
        await simulateFullBracketWithAI();
    });

    document.getElementById("reset-bracket-btn").addEventListener("click", async () => {
        buildBracketFromGroups();
        if (STATE.authToken && CONFIG.USE_LIVE_API) await ensureRoundOf32MatchIds();
        renderBracket();
        renderDashboard();
        showToast("Bracket reset.", "success");
    });
}

/* Runs the AI over every remaining unresolved match, in stage order (each round's matchups
   depend on the previous round's AI-decided winners). Any pick the user already made before
   clicking this is graded normally; matches with no pick are just resolved with no points. */
async function simulateFullBracketWithAI() {
    let correct = 0, total = 0;
    for (const stage of STAGE_ORDER) {
        for (let idx = 0; idx < STATE.bracket[stage].length; idx++) {
            const before = STATE.bracket[stage][idx];
            if (!before.teamA || !before.teamB || before.winner) continue;
            await resolveMatchWithAI(stage, idx);
            const after = STATE.bracket[stage][idx];
            if (after.pickWasCorrect != null) { total++; if (after.pickWasCorrect) correct++; }
        }
    }
    renderBracket();
    renderDashboard();
    if (total > 0) showToast(`Done — you matched the AI on ${correct}/${total} of your picks.`, "success");
    else showToast("Done — the AI resolved every remaining match.", "success");
}

/* ============================== LEADERBOARD (real, from MySQL via the backend) ============================== */
async function loadLeaderboard() {
    if (!CONFIG.USE_LIVE_API) {
        STATE.leaderboard = []; // no backend connection -> no fabricated names, just empty
        return;
    }
    try {
        const rows = await apiGet(CONFIG.ENDPOINTS.leaderboard);
        STATE.leaderboard = rows.map((r) => ({
            rank: r.rank, user: r.username, correct: r.correctPredictions,
            points: r.points, accuracy: r.accuracy.toFixed(1), country: r.countryIso || "un",
            totalPredictions: r.totalPredictions,
        }));
    } catch (e) {
        console.warn("[leaderboard] failed to load from backend:", e);
        STATE.leaderboard = [];
    }
}

/* Makes sure the real 16 Round of 32 matches exist as rows in MySQL (creating them the first
   time), and records each match's real backend Id on STATE.bracket.R32 so a user's pick can be
   POSTed to /api/predictions/mine with a real MatchId. */
async function ensureRoundOf32MatchIds() {
    if (!CONFIG.USE_LIVE_API || !STATE.bracket) return;
    try {
        const existing = await apiGet(`${CONFIG.ENDPOINTS.matches}?stage=RoundOf32`);
        const byPair = new Map(existing.map((m) => [`${m.teamAName}|${m.teamBName}`, m.id]));
        for (const m of STATE.bracket.R32) {
            const key = `${m.teamA.name}|${m.teamB.name}`;
            if (byPair.has(key)) { m.backendMatchId = byPair.get(key); continue; }
            const created = await apiPost(CONFIG.ENDPOINTS.matches, { teamAId: m.teamA.id, teamBId: m.teamB.id, stage: 1, groupName: null });
            m.backendMatchId = created.id;
        }
    } catch (e) {
        console.warn("[matches] could not sync Round of 32 match ids with backend:", e);
    }
}

function renderLeaderboard(filter = "") {
    const tbody = document.getElementById("leaderboard-body");
    const rows = STATE.leaderboard.filter((u) => u.user.toLowerCase().includes(filter.toLowerCase()));
    tbody.innerHTML = rows.map((u) => {
        const rankClass = u.rank === 1 ? "gold" : u.rank === 2 ? "silver" : u.rank === 3 ? "bronze" : "";
        return `
    <tr>
      <td><span class="rank-badge ${rankClass}">${u.rank}</span></td>
      <td><div class="user-cell"><div class="avatar">${u.user.slice(0, 2).toUpperCase()}</div>${u.user}</div></td>
      <td>${u.correct}</td>
      <td><strong>${u.points.toLocaleString()}</strong></td>
      <td><div class="accuracy-bar"><span style="width:${u.accuracy}%"></span></div> ${u.accuracy}%</td>
      <td><img src="${flagUrl(u.country, "w40")}" style="width:22px;height:16px;object-fit:cover;border-radius:3px" alt=""></td>
    </tr>`;
    }).join("") || `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>${
        !CONFIG.USE_LIVE_API
            ? `Can't reach the backend at ${CONFIG.API_BASE} — connect it to see real predictions here.`
            : STATE.leaderboard.length === 0
                ? "No one has logged in and predicted yet — be the first!"
                : "No players found."
    }</p></div></td></tr>`;
}

function wireLeaderboardToolbar() {
    document.getElementById("lb-search").addEventListener("input", (e) => renderLeaderboard(e.target.value));
}

/* ============================== CHARTS (Chart.js) ============================== */
function renderCharts() {
    if (typeof Chart === "undefined") {
        console.warn("[charts] Chart.js did not load (CDN blocked?) — skipping charts.");
        document.querySelectorAll(".chart-card canvas").forEach((c) => {
            c.replaceWith(Object.assign(document.createElement("div"), {
                className: "empty-state",
                innerHTML: '<i class="fa-solid fa-chart-simple"></i><p>Charts unavailable offline.</p>',
            }));
        });
        return;
    }
    const gold = "#C9A227", blue = "#0057B8", white = "#ffffff";
    Chart.defaults.color = "#93a2bd";
    Chart.defaults.font.family = "Inter";

    const byGroupChampions = ["Brazil", "France", "Argentina", "Spain", "England", "Portugal"];
    new Chart(document.getElementById("chart-champions"), {
        type: "bar",
        data: {
            labels: byGroupChampions,
            datasets: [{ label: "Predicted to win it all (%)", data: [22, 19, 17, 14, 11, 9], backgroundColor: [gold, blue, "#1b7fe0", "#e6c250", "#14345e", "#a9821c"], borderRadius: 8 }],
        },
        options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(255,255,255,.06)" } } } },
    });

    new Chart(document.getElementById("chart-selected"), {
        type: "doughnut",
        data: {
            labels: ["Brazil", "Argentina", "France", "Spain", "Others"],
            datasets: [{ data: [26, 22, 18, 14, 20], backgroundColor: [gold, blue, "#1b7fe0", "#e6c250", "#2a3e5c"], borderWidth: 0 }],
        },
        options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 16 } } }, cutout: "62%" },
    });

    new Chart(document.getElementById("chart-winprob"), {
        type: "radar",
        data: {
            labels: ["Attack", "Defense", "Form", "Possession", "Ranking"],
            datasets: [
                { label: "Brazil", data: [92, 78, 95, 88, 96], borderColor: gold, backgroundColor: "rgba(201,162,39,.18)" },
                { label: "France", data: [96, 82, 90, 86, 99], borderColor: blue, backgroundColor: "rgba(0,87,184,.18)" },
            ],
        },
        options: { scales: { r: { angleLines: { color: "rgba(255,255,255,.08)" }, grid: { color: "rgba(255,255,255,.08)" }, pointLabels: { color: white }, ticks: { display: false } } } },
    });

    new Chart(document.getElementById("chart-distribution"), {
        type: "line",
        data: {
            labels: ["R32", "R16", "QF", "SF", "F"],
            datasets: [{ label: "Prediction confidence trend", data: [58, 63, 69, 74, 81], borderColor: gold, backgroundColor: "rgba(201,162,39,.15)", fill: true, tension: 0.4 }],
        },
        options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(255,255,255,.06)" } } } },
    });
}

/* ============================== AUTH (login / register) ============================== */
function wireModals() {
    document.querySelectorAll("[data-open-modal]").forEach((el) => {
        el.addEventListener("click", (e) => { e.preventDefault(); openModal(el.dataset.openModal); });
    });
    document.querySelectorAll("[data-close-modal]").forEach((el) => {
        el.addEventListener("click", () => closeModal(el.closest(".modal-overlay").id));
    });
    document.querySelectorAll(".modal-overlay").forEach((ov) => {
        ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(ov.id); });
    });
    document.querySelectorAll(".toggle-pass").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = btn.parentElement.querySelector("input");
            input.type = input.type === "password" ? "text" : "password";
            btn.classList.toggle("fa-eye"); btn.classList.toggle("fa-eye-slash");
        });
    });

    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("register-form").addEventListener("submit", handleRegister);

    document.getElementById("logout-btn")?.addEventListener("click", (e) => { e.preventDefault(); logout(); });
}

function openModal(id) { document.getElementById(id).classList.add("open"); document.body.style.overflow = "hidden"; }
function closeModal(id) { document.getElementById(id).classList.remove("open"); document.body.style.overflow = ""; }
window.openModal = openModal;
window.closeModal = closeModal;

function validateField(input, condition, msgEl) {
    const ok = condition;
    input.classList.toggle("error", !ok);
    if (msgEl) msgEl.classList.toggle("show", !ok);
    return ok;
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector("#login-email");
    const pass = form.querySelector("#login-password");
    const emailOk = validateField(email, /^\S+@\S+\.\S+$/.test(email.value), form.querySelector("#login-email-error"));
    const passOk = validateField(pass, pass.value.length >= 6, form.querySelector("#login-password-error"));
    if (!emailOk || !passOk) return;

    if (!CONFIG.USE_LIVE_API) {
        showToast("Backend isn't connected — start your API to log in for real.", "error");
        return;
    }
    try {
        const auth = await apiPost(CONFIG.ENDPOINTS.login, { email: email.value, password: pass.value });
        setSession(auth);
    } catch (err) {
        showToast("Incorrect email/username or password.", "error");
        return;
    }
    closeModal("login-modal");
    showToast("Welcome back! You're signed in.", "success");
    form.reset();
    await afterAuthSync();
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const fullName = form.querySelector("#reg-name");
    const username = form.querySelector("#reg-username");
    const country = form.querySelector("#reg-country");
    const email = form.querySelector("#reg-email");
    const pass = form.querySelector("#reg-password");
    const confirm = form.querySelector("#reg-confirm");

    const nameOk = validateField(fullName, fullName.value.trim().length > 1, form.querySelector("#reg-name-error"));
    const userOk = validateField(username, /^[a-zA-Z0-9_]{3,}$/.test(username.value), form.querySelector("#reg-username-error"));
    const emailOk = validateField(email, /^\S+@\S+\.\S+$/.test(email.value), form.querySelector("#reg-email-error"));
    const passOk = validateField(pass, pass.value.length >= 6, form.querySelector("#reg-password-error"));
    const confirmOk = validateField(confirm, confirm.value === pass.value && confirm.value.length > 0, form.querySelector("#reg-confirm-error"));
    if (!nameOk || !userOk || !emailOk || !passOk || !confirmOk) return;

    if (!CONFIG.USE_LIVE_API) {
        showToast("Backend isn't connected — start your API to create a real account.", "error");
        return;
    }
    let auth;
    try {
        auth = await apiPost(CONFIG.ENDPOINTS.register, {
            fullName: fullName.value, username: username.value, email: email.value,
            password: pass.value, countryIso: country.value || null,
        });
        setSession(auth);
    } catch (err) {
        showToast("That username or email is already taken.", "error");
        return;
    }
    if (pendingRegisterAvatar) saveAvatar(auth.email, pendingRegisterAvatar);
    closeModal("register-modal");
    showToast("Account created — welcome to the predictor!", "success");
    form.reset();
    pendingRegisterAvatar = null;
    resetAvatarPreview("reg-avatar-preview", "reg-avatar-icon");
    await afterAuthSync();
}

/* Once logged in against the real backend: make sure the real Round of 32 matches exist as
   rows in MySQL (so picks have a real MatchId to attach to), then refresh the real leaderboard
   and admin stats so they reflect this account immediately. */
async function afterAuthSync() {
    await ensureRoundOf32MatchIds();
    await loadLeaderboard();
    if (STATE.page === "leaderboard") renderLeaderboard();
    if (STATE.page === "admin") renderAdmin();
}

function setSession(auth) {
    STATE.currentUser = { name: auth.fullName, username: auth.username, email: auth.email, countryIso: auth.countryIso, isAdmin: auth.isAdmin };
    STATE.authToken = auth.token || STATE.authToken;
    localStorage.setItem("wc_user", JSON.stringify(STATE.currentUser));
    if (STATE.authToken) localStorage.setItem("wc_token", STATE.authToken);
    updateAuthUI();
}
function logout() {
    if (STATE.authToken && CONFIG.USE_LIVE_API) {
        apiPost(CONFIG.ENDPOINTS.logout).catch(() => {}); // best-effort server-side session invalidation
    }
    STATE.currentUser = null;
    STATE.authToken = null;
    localStorage.removeItem("wc_user");
    localStorage.removeItem("wc_token");
    updateAuthUI();
    goToPage("home");
    showToast("Signed out.", "success");
}
function restoreSession() {
    const raw = localStorage.getItem("wc_user");
    const token = localStorage.getItem("wc_token");
    if (raw) STATE.currentUser = JSON.parse(raw);
    if (token) STATE.authToken = token;
    updateAuthUI();
}
function updateAuthUI() {
    const loginBtn = document.getElementById("nav-login-btn");
    const profileBtn = document.getElementById("nav-profile-btn");
    const predictorBanner = document.getElementById("predictor-login-banner");
    if (STATE.currentUser) {
        loginBtn.style.display = "none";
        profileBtn.style.display = "inline-flex";
        if (predictorBanner) predictorBanner.style.display = "none";
    } else {
        loginBtn.style.display = "inline-flex";
        profileBtn.style.display = "none";
        if (predictorBanner) predictorBanner.style.display = "flex";
    }
}

/* ============================== AVATARS (stored locally per account — no backend upload
   endpoint exists yet, so photos live in this browser's localStorage, keyed by email) ============================== */
let pendingRegisterAvatar = null; // dataURL picked before the account exists yet
let pendingEditAvatar = null; // dataURL picked while editing; null = "leave unchanged"

function avatarKey(email) { return `wc_avatar_${(email || "").trim().toLowerCase()}`; }
function saveAvatar(email, dataUrl) {
    if (!email) return;
    try { localStorage.setItem(avatarKey(email), dataUrl); }
    catch (e) { console.warn("[avatar] failed to save (image may be too large):", e); showToast("Couldn't save that photo — try a smaller image.", "error"); }
}
function loadAvatarDataUrl(email) { return email ? localStorage.getItem(avatarKey(email)) : null; }
function resetAvatarPreview(previewId, iconId) {
    const preview = document.getElementById(previewId);
    const icon = document.getElementById(iconId);
    if (preview) { preview.removeAttribute("src"); preview.style.display = "none"; }
    if (icon) icon.style.display = "block";
}

function wireAvatarUploads() {
    wireSingleAvatarUpload("reg-avatar-input", "reg-avatar-preview", "reg-avatar-icon", (dataUrl) => { pendingRegisterAvatar = dataUrl; });
    wireSingleAvatarUpload("edit-avatar-input", "edit-avatar-preview", "edit-avatar-icon", (dataUrl) => { pendingEditAvatar = dataUrl; });
}
function wireSingleAvatarUpload(inputId, previewId, iconId, onPicked) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const icon = document.getElementById(iconId);
    if (!input || !preview) return;
    input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { showToast("Please choose an image file.", "error"); return; }
        if (file.size > 2 * 1024 * 1024) { showToast("Please choose an image under 2MB.", "error"); return; }
        const reader = new FileReader();
        reader.onload = () => {
            preview.src = reader.result;
            preview.style.display = "block";
            if (icon) icon.style.display = "none";
            onPicked(reader.result);
        };
        reader.readAsDataURL(file);
    });
}

/* ============================== EDIT PROFILE ============================== */
function wireEditProfile() {
    document.getElementById("edit-profile-btn")?.addEventListener("click", () => {
        if (!requireLogin("edit your profile")) return;
        openEditProfileModal();
    });
    document.getElementById("edit-profile-form")?.addEventListener("submit", handleEditProfile);
}

function openEditProfileModal() {
    pendingEditAvatar = null;
    const user = STATE.currentUser;
    document.getElementById("edit-name").value = user.name || "";
    document.getElementById("edit-email").value = user.email || "";
    document.getElementById("edit-country").value = (user.countryIso || "").toLowerCase();
    const existing = loadAvatarDataUrl(user.email);
    const preview = document.getElementById("edit-avatar-preview");
    const icon = document.getElementById("edit-avatar-icon");
    if (existing) { preview.src = existing; preview.style.display = "block"; icon.style.display = "none"; }
    else { resetAvatarPreview("edit-avatar-preview", "edit-avatar-icon"); }
    openModal("edit-profile-modal");
}

function handleEditProfile(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector("#edit-name");
    const nameOk = validateField(name, name.value.trim().length > 1, form.querySelector("#edit-name-error"));
    if (!nameOk) return;

    STATE.currentUser.name = name.value.trim();
    const country = form.querySelector("#edit-country").value;
    if (country) STATE.currentUser.countryIso = country;
    localStorage.setItem("wc_user", JSON.stringify(STATE.currentUser));
    if (pendingEditAvatar) saveAvatar(STATE.currentUser.email, pendingEditAvatar);
    pendingEditAvatar = null;

    closeModal("edit-profile-modal");
    showToast("Profile updated.", "success");
    renderProfile();
    if (STATE.page === "leaderboard") renderLeaderboard(document.getElementById("lb-search")?.value || "");
}

/* ============================== PROFILE ============================== */
async function renderProfile() {
    const user = STATE.currentUser;
    const editBtn = document.getElementById("edit-profile-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const loginBtn = document.getElementById("profile-login-btn");
    const avatarImg = document.getElementById("profile-avatar-img");
    const avatarLetters = document.getElementById("profile-avatar-letters");
    const badgesEl = document.getElementById("profile-badges");
    const historyEl = document.getElementById("profile-history");
    const statEls = {
        fav: document.getElementById("stat-favourite-team"),
        acc: document.getElementById("stat-accuracy"),
        total: document.getElementById("stat-total-predictions"),
        rank: document.getElementById("stat-rank"),
    };

    if (!user) {
        document.getElementById("profile-name").textContent = "Guest Predictor";
        document.getElementById("profile-email").textContent = "guest@worldcup.app";
        avatarLetters.textContent = "GP"; avatarLetters.style.display = "flex";
        avatarImg.style.display = "none";
        badgesEl.innerHTML = `<span class="badge-empty">Log in and start predicting to earn badges.</span>`;
        statEls.fav.textContent = "—"; statEls.acc.textContent = "—"; statEls.total.textContent = "—"; statEls.rank.textContent = "—";
        if (editBtn) editBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (loginBtn) loginBtn.style.display = "inline-flex";
        historyEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>Log in and make some predictions to see your history here.</p></div>`;
        return;
    }

    if (editBtn) editBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    if (loginBtn) loginBtn.style.display = "none";

    document.getElementById("profile-name").textContent = user.name || user.username || "Predictor";
    document.getElementById("profile-email").textContent = user.email || "";

    const avatarUrl = loadAvatarDataUrl(user.email);
    if (avatarUrl) {
        avatarImg.src = avatarUrl; avatarImg.style.display = "block";
        avatarLetters.style.display = "none";
    } else {
        avatarImg.style.display = "none"; avatarLetters.style.display = "flex";
        avatarLetters.textContent = (user.name || user.username || "GP").trim().slice(0, 2).toUpperCase();
    }

    if (!STATE.authToken || !CONFIG.USE_LIVE_API) {
        historyEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>Log in and make some predictions to see your history here.</p></div>`;
        badgesEl.innerHTML = `<span class="badge-empty">Connect the backend to track real stats.</span>`;
        statEls.fav.textContent = "—"; statEls.acc.textContent = "—"; statEls.total.textContent = "—"; statEls.rank.textContent = "—";
        return;
    }

    try {
        await loadLeaderboard();
        const mine = await apiGet(CONFIG.ENDPOINTS.myPredictions); // newest first

        if (!mine.length) {
            historyEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>No predictions yet — head to the bracket and make some picks!</p></div>`;
        } else {
            historyEl.innerHTML = mine.map((p) => {
                const label = p.isCorrect === true ? "Correct · +100" : p.isCorrect === false ? "Wrong" : "Pending";
                const cls = p.isCorrect === true ? "correct" : p.isCorrect === false ? "wrong" : "";
                return `<div class="history-item ${cls}"><span>${p.teamAName} vs ${p.teamBName}</span><strong>${label}</strong></div>`;
            }).join("");
        }

        // Real stats sourced from the leaderboard (server-computed) for this exact user.
        const mineEntry = STATE.leaderboard.find((r) => (r.user || "").toLowerCase() === (user.username || "").toLowerCase());
        const totalPredictions = mineEntry ? mineEntry.totalPredictions : mine.length;
        const accuracy = mineEntry ? +mineEntry.accuracy : null;
        const rank = mineEntry ? mineEntry.rank : null;

        statEls.total.textContent = totalPredictions;
        statEls.acc.textContent = (accuracy !== null && totalPredictions > 0) ? `${accuracy}%` : "No graded picks yet";
        statEls.rank.textContent = rank ? `#${rank}` : "Unranked";

        // Favourite team: whichever team this user has actually picked to win most often.
        const counts = {};
        mine.forEach((p) => { if (p.predictedWinnerId) counts[p.predictedWinnerId] = (counts[p.predictedWinnerId] || 0) + 1; });
        const topId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        const topTeam = topId ? teamById(+topId) : null;
        statEls.fav.textContent = topTeam ? topTeam.name : "—";

        // Badges: earned from the real numbers above, never decoration.
        const badges = [];
        const graded = mine.filter((p) => p.isCorrect !== null);
        if (rank && STATE.leaderboard.length > 0 && rank <= Math.max(1, Math.ceil(STATE.leaderboard.length * 0.1))) {
            badges.push(`<span class="badge-chip"><i class="fa-solid fa-medal"></i> Top 10%</span>`);
        }
        if (graded.length >= 5 && accuracy !== null && accuracy >= 70) {
            badges.push(`<span class="badge-chip"><i class="fa-solid fa-bullseye"></i> Sharp Shooter</span>`);
        }
        let streak = 0;
        for (const p of mine) { // already newest-first
            if (p.isCorrect === true) streak++;
            else if (p.isCorrect === false) break;
        }
        if (streak >= 3) badges.push(`<span class="badge-chip"><i class="fa-solid fa-fire"></i> ${streak}-Win Streak</span>`);

        badgesEl.innerHTML = badges.length ? badges.join("") : `<span class="badge-empty">No badges yet — make some predictions to earn your first one!</span>`;
    } catch (e) {
        console.warn("[profile] failed to load real prediction history:", e);
        historyEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Couldn't load your prediction history right now.</p></div>`;
    }
}

/* ============================== ADMIN DASHBOARD ============================== */
function wireAdmin() {
    document.querySelectorAll(".admin-nav button").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".admin-nav button").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            STATE.adminSection = btn.dataset.section;
            renderAdminSection();
        });
    });
}

async function renderAdmin() {
    // Show what we know immediately (no random padding), then refresh with the real backend counts.
    document.getElementById("admin-total-teams").textContent = STATE.teams.length;
    document.getElementById("admin-total-matches").textContent = STATE.matches.length || 104;
    document.getElementById("admin-total-users").textContent = CONFIG.USE_LIVE_API ? "…" : "0";
    document.getElementById("admin-total-predictions").textContent = CONFIG.USE_LIVE_API ? "…" : "0";
    renderAdminSection();

    if (!CONFIG.USE_LIVE_API) return;
    try {
        const stats = await apiGet(CONFIG.ENDPOINTS.adminStats);
        document.getElementById("admin-total-teams").textContent = stats.totalTeams;
        document.getElementById("admin-total-matches").textContent = stats.totalMatches;
        document.getElementById("admin-total-users").textContent = stats.totalUsers;
        document.getElementById("admin-total-predictions").textContent = stats.totalPredictions;
    } catch (e) {
        console.warn("[admin] failed to load real stats from backend:", e);
    }
}

function renderAdminSection() {
    const wrap = document.getElementById("admin-content");
    const section = STATE.adminSection;
    if (section === "teams") {
        wrap.innerHTML = `
      <div class="glass admin-table-wrap" style="padding:8px">
        <table class="admin-table">
          <thead><tr><th>#</th><th>Team</th><th>Group</th><th>Ranking</th><th>Form</th><th>Actions</th></tr></thead>
          <tbody>${STATE.teams.map((t) => `
            <tr>
              <td>${t.id}</td>
              <td><div class="team-cell"><img src="${flagUrl(t.iso, "w40")}" alt="">${t.name}</div></td>
              <td>${t.group}</td>
              <td>#${t.fifaRanking}</td>
              <td>${t.form}/5</td>
              <td class="table-actions">
                <button class="icon-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn del" title="Delete"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    } else if (section === "matches") {
        const sample = STATE.bracket.R32.slice(0, 10);
        wrap.innerHTML = `
      <div class="glass admin-table-wrap" style="padding:8px">
        <table class="admin-table">
          <thead><tr><th>Match</th><th>Team A</th><th>Team B</th><th>Stage</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${sample.map((m, i) => `
            <tr>
              <td>#${i + 1}</td>
              <td>${m.teamA.name}</td>
              <td>${m.teamB.name}</td>
              <td>Round of 32</td>
              <td><span class="status-pill ${m.winner ? "on" : "off"}">${m.winner ? "Played" : "Scheduled"}</span></td>
              <td class="table-actions">
                <button class="icon-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn del" title="Delete"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    } else if (section === "users") {
        wrap.innerHTML = `
      <div class="glass admin-table-wrap" style="padding:8px">
        <table class="admin-table">
          <thead><tr><th>User</th><th>Email</th><th>Predictions</th><th>Points</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${STATE.leaderboard.map((u) => `
            <tr>
              <td><div class="user-cell"><div class="avatar">${u.user.slice(0, 2).toUpperCase()}</div>${u.user}</div></td>
              <td>${u.user.toLowerCase()}@mail.com</td>
              <td>${u.correct}</td>
              <td>${u.points}</td>
              <td><span class="status-pill on">Active</span></td>
              <td class="table-actions">
                <button class="icon-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn del" title="Ban"><i class="fa-solid fa-ban"></i></button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    } else if (section === "settings") {
        wrap.innerHTML = `
      <div class="glass" style="padding:28px;max-width:560px">
        <div class="form-group"><label>API Base URL</label><input id="admin-api-base" value="${CONFIG.API_BASE}"></div>
        <div class="form-group"><label>Tournament Stage</label><select><option>Group Stage</option><option>Round of 32</option><option>Knockouts</option></select></div>
        <button class="btn btn-primary" id="admin-save-settings"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
      </div>`;
        wrap.querySelector("#admin-save-settings").addEventListener("click", () => {
            CONFIG.API_BASE = wrap.querySelector("#admin-api-base").value;
            showToast("Settings saved.", "success");
        });
    } else {
        wrap.innerHTML = `
      <div class="stats-grid">
        <div class="glass chart-card"><h4><i class="fa-solid fa-chart-column"></i> Predictions per stage</h4><canvas id="admin-chart-1"></canvas></div>
        <div class="glass chart-card"><h4><i class="fa-solid fa-chart-pie"></i> User activity</h4><canvas id="admin-chart-2"></canvas></div>
      </div>`;
        if (typeof Chart === "undefined") return;
        new Chart(document.getElementById("admin-chart-1"), {
            type: "bar",
            data: { labels: ["Group", "R32", "R16", "QF", "SF", "Final"], datasets: [{ label: "Predictions", data: [820, 610, 480, 310, 160, 90], backgroundColor: "#C9A227", borderRadius: 6 }] },
            options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(255,255,255,.06)" } } } },
        });
        new Chart(document.getElementById("admin-chart-2"), {
            type: "doughnut",
            data: { labels: ["Daily", "Weekly", "One-time"], datasets: [{ data: [45, 35, 20], backgroundColor: ["#C9A227", "#0057B8", "#2a3e5c"], borderWidth: 0 }] },
            options: { plugins: { legend: { position: "bottom" } }, cutout: "60%" },
        });
    }
}

/* ============================== MISC (footer year, tabs, toasts) ============================== */
function wireMisc() {
    document.getElementById("footer-year").textContent = new Date().getFullYear();
    wireTeamsToolbar();
    wireBracketToolbar();
    wireLeaderboardToolbar();

    document.querySelectorAll(".stage-tabs button").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".stage-tabs button").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("bracket-scroll").scrollTo({ left: STAGE_ORDER.indexOf(btn.dataset.stage) * 290, behavior: "smooth" });
        });
    });

    document.body.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn");
        if (!btn) return;
        const circle = document.createElement("span");
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        circle.className = "ripple";
        circle.style.width = circle.style.height = `${size}px`;
        circle.style.left = `${e.clientX - rect.left - size / 2}px`;
        circle.style.top = `${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
    });
}

function showToast(message, type = "success") {
    const stack = document.getElementById("toast-stack");
    const toast = document.createElement("div");
    toast.className = `toast glass ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-circle-check" : "fa-triangle-exclamation"}"></i><span class="msg">${message}</span>`;
    stack.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("leaving");
        setTimeout(() => toast.remove(), 300);
    }, 3400);
}
window.showToast = showToast;