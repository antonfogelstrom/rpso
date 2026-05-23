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
