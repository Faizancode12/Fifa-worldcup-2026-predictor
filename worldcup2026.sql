-- ============================================================================
-- FIFA World Cup 2026 Prediction & Simulation System
-- MySQL schema + seed data (48 fixed teams) + real user accounts / leaderboard
-- Tested end-to-end against MariaDB 10.11 / MySQL-compatible syntax.
--
-- WARNING: this file starts with DROP DATABASE — running it wipes any existing
-- worldcup2026 database (including registered users). If you already have real
-- users/data you want to keep, use add_user_tables.sql instead, which only adds
-- the new tables without touching anything else.
-- ============================================================================

DROP DATABASE IF EXISTS worldcup2026;
CREATE DATABASE worldcup2026 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE worldcup2026;
USE worldcup2026;


-- ----------------------------------------------------------------------------
-- Teams
-- ----------------------------------------------------------------------------
CREATE TABLE Teams (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL UNIQUE,
    `Group`         CHAR(1) NOT NULL,
    FifaRanking     INT NOT NULL,
    AttackRating    DECIMAL(4,2) NOT NULL,
    DefenseRating   DECIMAL(4,2) NOT NULL,
    Form            INT NOT NULL,
    Possession      DECIMAL(5,2) NOT NULL,
    CONSTRAINT chk_group CHECK (`Group` BETWEEN 'A' AND 'L'),
    CONSTRAINT chk_form CHECK (Form BETWEEN 0 AND 5),
    CONSTRAINT chk_possession CHECK (Possession BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Matches
-- ----------------------------------------------------------------------------
CREATE TABLE Matches (
    Id                  INT AUTO_INCREMENT PRIMARY KEY,
    TeamAId             INT NOT NULL,
    TeamBId             INT NOT NULL,
    TeamAScore          INT NOT NULL DEFAULT 0,
    TeamBScore          INT NOT NULL DEFAULT 0,
    Stage               ENUM('Group','RoundOf32','RoundOf16','QuarterFinal','SemiFinal','Final') NOT NULL,
    GroupName           CHAR(1) NULL,
    IsPlayed            TINYINT(1) NOT NULL DEFAULT 0,
    WinnerTeamId        INT NULL,
    DecidedByPenalties  TINYINT(1) NOT NULL DEFAULT 0,
    SimulatedAtUtc      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_match_team_a FOREIGN KEY (TeamAId) REFERENCES Teams(Id) ON DELETE RESTRICT,
    CONSTRAINT fk_match_team_b FOREIGN KEY (TeamBId) REFERENCES Teams(Id) ON DELETE RESTRICT,
    CONSTRAINT fk_match_winner FOREIGN KEY (WinnerTeamId) REFERENCES Teams(Id) ON DELETE SET NULL,
    CONSTRAINT chk_teams_differ CHECK (TeamAId <> TeamBId),
    INDEX idx_matches_stage (Stage),
    INDEX idx_matches_group (GroupName)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Predictions (the AI engine's own prediction for a match — NOT a user's pick)
-- ----------------------------------------------------------------------------
CREATE TABLE Predictions (
    Id                  INT AUTO_INCREMENT PRIMARY KEY,
    MatchId             INT NOT NULL,
    PredictedWinner     INT NULL,
    WinProbabilityA     DECIMAL(6,4) NOT NULL,
    WinProbabilityB     DECIMAL(6,4) NOT NULL,
    DrawProbability     DECIMAL(6,4) NOT NULL,
    AiScoreA            DECIMAL(6,4) NOT NULL,
    AiScoreB            DECIMAL(6,4) NOT NULL,
    PredictedScoreA     INT NULL,
    PredictedScoreB     INT NULL,
    DecidedByPenalties  TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAtUtc        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prediction_match FOREIGN KEY (MatchId) REFERENCES Matches(Id) ON DELETE CASCADE,
    CONSTRAINT fk_prediction_winner FOREIGN KEY (PredictedWinner) REFERENCES Teams(Id) ON DELETE SET NULL,
    INDEX idx_predictions_match (MatchId)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Users (real registered accounts — passwords are PBKDF2-hashed, never plain text)
-- ----------------------------------------------------------------------------
CREATE TABLE Users (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    Username        VARCHAR(50) NOT NULL UNIQUE,
    FullName        VARCHAR(50) NOT NULL,
    Email           VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash    VARCHAR(255) NOT NULL,
    PasswordSalt    VARCHAR(255) NOT NULL,
    CountryIso      VARCHAR(5) NULL,
    IsAdmin         TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAtUtc    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- UserSessions (opaque bearer tokens for login state — deleting a row = logout)
-- ----------------------------------------------------------------------------
CREATE TABLE UserSessions (
    Id              INT AUTO_INCREMENT PRIMARY KEY,
    UserId          INT NOT NULL,
    Token           VARCHAR(128) NOT NULL UNIQUE,
    CreatedAtUtc    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAtUtc    DATETIME NOT NULL,
    CONSTRAINT fk_session_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- UserPredictions (a real logged-in user's own pick per match — feeds the
-- real leaderboard and the real admin "Predictions" count)
-- ----------------------------------------------------------------------------
CREATE TABLE UserPredictions (
    Id                  INT AUTO_INCREMENT PRIMARY KEY,
    UserId              INT NOT NULL,
    MatchId             INT NOT NULL,
    PredictedWinnerId   INT NULL,
    PredictedScoreA     INT NULL,
    PredictedScoreB     INT NULL,
    IsCorrect           TINYINT(1) NULL,
    PointsAwarded       INT NOT NULL DEFAULT 0,
    CreatedAtUtc        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAtUtc        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_userprediction_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT fk_userprediction_match FOREIGN KEY (MatchId) REFERENCES Matches(Id) ON DELETE CASCADE,
    CONSTRAINT fk_userprediction_winner FOREIGN KEY (PredictedWinnerId) REFERENCES Teams(Id) ON DELETE SET NULL,
    UNIQUE KEY uq_user_match (UserId, MatchId)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Seed data: 48 fixed teams (Id, Group, FIFA ranking exactly as specified).
-- AttackRating / DefenseRating / Form / Possession are derived deterministically
-- from each team's FIFA ranking (used consistently by the PredictionEngine).
-- ----------------------------------------------------------------------------
INSERT INTO Teams (Id, Name, `Group`, FifaRanking, AttackRating, DefenseRating, Form, Possession) VALUES
    (1, 'Mexico', 'A', 15, 2.33, 0.77, 5, 61.00),
    (2, 'South Korea', 'A', 25, 2.21, 0.89, 4, 59.00),
    (3, 'Czechia', 'A', 41, 2.02, 1.08, 4, 55.00),
    (4, 'South Africa', 'A', 60, 1.79, 1.31, 4, 50.00),
    (5, 'Switzerland', 'B', 19, 2.28, 0.82, 5, 60.00),
    (6, 'Canada', 'B', 30, 2.15, 0.95, 4, 58.00),
    (7, 'Qatar', 'B', 35, 2.09, 1.01, 4, 56.00),
    (8, 'Bosnia', 'B', 52, 1.89, 1.21, 4, 52.00),
    (9, 'Brazil', 'C', 6, 2.44, 0.66, 5, 64.00),
    (10, 'Morocco', 'C', 8, 2.42, 0.68, 5, 63.00),
    (11, 'Scotland', 'C', 47, 1.95, 1.15, 4, 53.00),
    (12, 'Haiti', 'C', 83, 1.52, 1.58, 3, 44.00),
    (13, 'USA', 'D', 16, 2.32, 0.78, 5, 61.00),
    (14, 'Paraguay', 'D', 64, 1.74, 1.36, 3, 49.00),
    (15, 'Australia', 'D', 26, 2.20, 0.90, 4, 58.00),
    (16, 'Turkiye', 'D', 42, 2.01, 1.09, 4, 54.00),
    (17, 'Germany', 'E', 10, 2.39, 0.71, 5, 62.00),
    (18, 'Ecuador', 'E', 24, 2.22, 0.88, 4, 59.00),
    (19, 'Ivory Coast', 'E', 33, 2.12, 0.98, 4, 57.00),
    (20, 'Curacao', 'E', 81, 1.54, 1.56, 3, 45.00),
    (21, 'Netherlands', 'F', 7, 2.43, 0.67, 5, 63.00),
    (22, 'Japan', 'F', 18, 2.30, 0.80, 5, 60.00),
    (23, 'Sweden', 'F', 39, 2.04, 1.06, 4, 55.00),
    (24, 'Tunisia', 'F', 40, 2.03, 1.07, 4, 55.00),
    (25, 'Belgium', 'G', 9, 2.40, 0.70, 5, 63.00),
    (26, 'Iran', 'G', 21, 2.26, 0.84, 4, 60.00),
    (27, 'Egypt', 'G', 29, 2.16, 0.94, 4, 58.00),
    (28, 'New Zealand', 'G', 95, 1.37, 1.73, 3, 41.00),
    (29, 'Spain', 'H', 2, 2.49, 0.61, 5, 64.00),
    (30, 'Uruguay', 'H', 17, 2.31, 0.79, 5, 61.00),
    (31, 'Saudi Arabia', 'H', 57, 1.83, 1.27, 4, 51.00),
    (32, 'Cape Verde', 'H', 70, 1.67, 1.43, 3, 48.00),
    (33, 'France', 'I', 1, 2.50, 0.60, 5, 65.00),
    (34, 'Senegal', 'I', 14, 2.34, 0.76, 5, 62.00),
    (35, 'Norway', 'I', 44, 1.98, 1.12, 4, 54.00),
    (36, 'Iraq', 'I', 61, 1.78, 1.32, 3, 50.00),
    (37, 'Argentina', 'J', 3, 2.48, 0.62, 5, 64.00),
    (38, 'Austria', 'J', 23, 2.24, 0.86, 4, 59.00),
    (39, 'Algeria', 'J', 36, 2.08, 1.02, 4, 56.00),
    (40, 'Jordan', 'J', 68, 1.70, 1.40, 3, 48.00),
    (41, 'Portugal', 'K', 5, 2.45, 0.65, 5, 64.00),
    (42, 'Colombia', 'K', 13, 2.36, 0.74, 5, 62.00),
    (43, 'DR Congo', 'K', 51, 1.90, 1.20, 4, 52.00),
    (44, 'Uzbekistan', 'K', 62, 1.77, 1.33, 3, 50.00),
    (45, 'England', 'L', 4, 2.46, 0.64, 5, 64.00),
    (46, 'Croatia', 'L', 11, 2.38, 0.72, 5, 62.00),
    (47, 'Ghana', 'L', 65, 1.73, 1.37, 3, 49.00),
    (48, 'Panama', 'L', 53, 1.88, 1.22, 4, 52.00);

-- ----------------------------------------------------------------------------
-- Convenience view: latest group standings, computed from played group matches.
-- ----------------------------------------------------------------------------
CREATE VIEW GroupStandings AS
SELECT
    t.Id AS TeamId,
    t.Name AS TeamName,
    t.`Group` AS GroupName,
    COUNT(m.Id) AS Played,
    SUM(CASE WHEN (m.TeamAId = t.Id AND m.TeamAScore > m.TeamBScore)
           OR (m.TeamBId = t.Id AND m.TeamBScore > m.TeamAScore) THEN 1 ELSE 0 END) AS Wins,
    SUM(CASE WHEN m.TeamAScore = m.TeamBScore THEN 1 ELSE 0 END) AS Draws,
    SUM(CASE WHEN (m.TeamAId = t.Id AND m.TeamAScore < m.TeamBScore)
           OR (m.TeamBId = t.Id AND m.TeamBScore < m.TeamAScore) THEN 1 ELSE 0 END) AS Losses,
    SUM(CASE WHEN m.TeamAId = t.Id THEN m.TeamAScore ELSE m.TeamBScore END) AS GoalsFor,
    SUM(CASE WHEN m.TeamAId = t.Id THEN m.TeamBScore ELSE m.TeamAScore END) AS GoalsAgainst,
    SUM(CASE WHEN (m.TeamAId = t.Id AND m.TeamAScore > m.TeamBScore)
           OR (m.TeamBId = t.Id AND m.TeamBScore > m.TeamAScore) THEN 2
           WHEN m.TeamAScore = m.TeamBScore THEN 1 ELSE 0 END) AS Points
FROM Teams t
LEFT JOIN Matches m
    ON (m.TeamAId = t.Id OR m.TeamBId = t.Id)
    AND m.Stage = 'Group'
    AND m.IsPlayed = 1
GROUP BY t.Id, t.Name, t.`Group`;

-- ----------------------------------------------------------------------------
-- Convenience view: real leaderboard, computed straight from Users + UserPredictions.
-- Mirrors exactly what GET /api/leaderboard returns — handy for checking the data
-- directly in MySQL Workbench / the mysql CLI.
-- ----------------------------------------------------------------------------
CREATE VIEW Leaderboard AS
SELECT
    u.Id AS UserId,
    u.Username,
    u.CountryIso,
    COUNT(up.Id) AS TotalPredictions,
    SUM(CASE WHEN up.IsCorrect = 1 THEN 1 ELSE 0 END) AS CorrectPredictions,
    COALESCE(SUM(up.PointsAwarded), 0) AS Points,
    ROUND(
        100.0 * SUM(CASE WHEN up.IsCorrect = 1 THEN 1 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN up.IsCorrect IS NOT NULL THEN 1 ELSE 0 END), 0),
        1
    ) AS Accuracy
FROM Users u
LEFT JOIN UserPredictions up ON up.UserId = u.Id
GROUP BY u.Id, u.Username, u.CountryIso
ORDER BY Points DESC, Accuracy DESC, u.Username ASC;