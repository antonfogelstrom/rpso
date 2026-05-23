package model

import (
	"time"

	"github.com/google/uuid"
)

type Player struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	TokenHash string    `json:"-"`
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
