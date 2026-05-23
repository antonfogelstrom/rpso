package db

import (
	"context"

	"github.com/antonfogelstrom/rpso/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RoundRepo struct {
	pool *pgxpool.Pool
}

func NewRoundRepo(pool *pgxpool.Pool) *RoundRepo {
	return &RoundRepo{pool: pool}
}

func (r *RoundRepo) Create(ctx context.Context, matchID uuid.UUID, roundNum int, p1Move, p2Move string, winnerID *uuid.UUID) (*model.Round, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO rounds (match_id, round_number, player1_move, player2_move, winner_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, match_id, round_number, player1_move, player2_move, winner_id, created_at`,
		matchID, roundNum, p1Move, p2Move, winnerID)

	rd := &model.Round{}
	err := row.Scan(&rd.ID, &rd.MatchID, &rd.RoundNumber, &rd.Player1Move, &rd.Player2Move, &rd.WinnerID, &rd.CreatedAt)
	if err != nil {
		return nil, err
	}
	return rd, nil
}

func (r *RoundRepo) GetByMatchID(ctx context.Context, matchID uuid.UUID) ([]*model.Round, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, match_id, round_number, player1_move, player2_move, winner_id, created_at
		 FROM rounds WHERE match_id = $1 ORDER BY round_number`, matchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rounds []*model.Round
	for rows.Next() {
		rd := &model.Round{}
		if err := rows.Scan(&rd.ID, &rd.MatchID, &rd.RoundNumber, &rd.Player1Move, &rd.Player2Move, &rd.WinnerID, &rd.CreatedAt); err != nil {
			return nil, err
		}
		rounds = append(rounds, rd)
	}
	return rounds, rows.Err()
}
