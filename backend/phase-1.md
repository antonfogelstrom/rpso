# Phase 1: Database Layer

## Goals
- Define shared models
- Implement migration SQL
- Build repository layer with `pgx`

## Files

### `migrations/001_init.sql`
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE players (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username   TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL,
    rating     INT NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE matches (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id            UUID NOT NULL REFERENCES players(id),
    player2_id            UUID NOT NULL REFERENCES players(id),
    winner_id             UUID REFERENCES players(id),
    player1_rating_before INT NOT NULL,
    player2_rating_before INT NOT NULL,
    rating_delta          INT NOT NULL DEFAULT 0,
    status                TEXT NOT NULL DEFAULT 'active',
    best_of               INT NOT NULL DEFAULT 3,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMPTZ
);

CREATE TABLE rounds (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    player1_move TEXT NOT NULL,
    player2_move TEXT NOT NULL,
    winner_id    UUID REFERENCES players(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_rounds_match ON rounds(match_id);
CREATE INDEX idx_players_rating ON players(rating DESC);
```

### `internal/model/types.go`
```go
package model

import (
    "time"
    "github.com/google/uuid"
)

type Player struct {
    ID        uuid.UUID `json:"id"`
    Username  string    `json:"username"`
    TokenHash string    `json:"-"` // never serialized
    Rating    int       `json:"rating"`
    CreatedAt time.Time `json:"created_at"`
}

type Match struct {
    ID                  uuid.UUID  `json:"id"`
    Player1ID           uuid.UUID  `json:"player1_id"`
    Player2ID           uuid.UUID  `json:"player2_id"`
    WinnerID            *uuid.UUID `json:"winner_id,omitempty"`
    Player1RatingBefore int        `json:"player1_rating_before"`
    Player2RatingBefore int        `json:"player2_rating_before"`
    RatingDelta         int        `json:"rating_delta"`
    Status              string     `json:"status"`
    BestOf              int        `json:"best_of"`
    CreatedAt           time.Time  `json:"created_at"`
    CompletedAt         *time.Time `json:"completed_at,omitempty"`
}

type Round struct {
    ID          uuid.UUID  `json:"id"`
    MatchID     uuid.UUID  `json:"match_id"`
    RoundNumber int        `json:"round_number"`
    Player1Move string     `json:"player1_move"`
    Player2Move string     `json:"player2_move"`
    WinnerID    *uuid.UUID `json:"winner_id,omitempty"`
    CreatedAt   time.Time  `json:"created_at"`
}
```

### `internal/db/pool.go`
- Initialize `pgxpool.Pool` from `DATABASE_URL` env var.
- Expose `NewPool(ctx) (*pgxpool.Pool, error)`.
- Expose `Pool` as package-level for simplicity or pass via dependency injection.

### `internal/db/players.go` — PlayerRepository

| Method | SQL | Purpose |
|--------|-----|---------|
| `CreatePlayer(ctx, username, tokenHash)` | `INSERT INTO players` | Registration |
| `GetPlayerByUsername(ctx, username)` | `SELECT ... WHERE username = $1` | Login lookup |
| `GetPlayerByID(ctx, id)` | `SELECT ... WHERE id = $1` | Profile |
| `UpdateRating(ctx, id, newRating)` | `UPDATE players SET rating = $1` | Post-match |
| `GetLeaderboard(ctx, limit)` | `SELECT ... ORDER BY rating DESC LIMIT $1` | Leaderboard |

### `internal/db/matches.go` — MatchRepository

| Method | SQL |
|--------|-----|
| `CreateMatch(ctx, p1, p2, bestOf, r1, r2)` | `INSERT INTO matches` |
| `GetMatchByID(ctx, id)` | `SELECT ... WHERE id = $1` |
| `GetMatchesByPlayerID(ctx, playerID, limit)` | `SELECT ... WHERE p1_id=$1 OR p2_id=$1 ORDER BY created_at DESC` |
| `CompleteMatch(ctx, id, winnerID, ratingDelta)` | `UPDATE matches SET status='completed', winner_id=$1, rating_delta=$2, completed_at=NOW()` |

### `internal/db/rounds.go` — RoundRepository

| Method | SQL |
|--------|-----|
| `CreateRound(ctx, matchID, roundNum, p1Move, p2Move, winnerID)` | `INSERT INTO rounds` |
| `GetRoundsByMatchID(ctx, matchID)` | `SELECT ... WHERE match_id = $1 ORDER BY round_number` |

## Concurrency & Edge Cases
- **Duplicate username**: `ON CONFLICT (username) DO NOTHING` + check rows affected.
- **Rating update race**: Use `pgx.BeginTx` with `TxOptions{IsoLevel: pgx.Serializable}` for the rating update transaction.
- **Connection pool**: One pool for the application lifetime; close on shutdown.
