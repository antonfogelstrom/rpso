package db

import (
	"context"

	"github.com/antonfogelstrom/rpso/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MatchRepo struct {
	pool *pgxpool.Pool
}

func NewMatchRepo(pool *pgxpool.Pool) *MatchRepo {
	return &MatchRepo{pool: pool}
}

func (r *MatchRepo) Create(ctx context.Context, tx pgx.Tx, p1ID, p2ID uuid.UUID, bestOf int, rating1, rating2 int) (*model.Match, error) {
	row := tx.QueryRow(ctx,
		`INSERT INTO matches (player1_id, player2_id, best_of, player1_rating_before, player2_rating_before)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, player1_id, player2_id, winner_id, player1_rating_before, player2_rating_before,
		           rating_delta, status, best_of, created_at, completed_at`,
		p1ID, p2ID, bestOf, rating1, rating2)

	m := &model.Match{}
	err := row.Scan(&m.ID, &m.Player1ID, &m.Player2ID, &m.WinnerID,
		&m.Player1RatingBefore, &m.Player2RatingBefore, &m.RatingDelta,
		&m.Status, &m.BestOf, &m.CreatedAt, &m.CompletedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *MatchRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Match, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, player1_id, player2_id, winner_id, player1_rating_before, player2_rating_before,
		        rating_delta, status, best_of, created_at, completed_at
		 FROM matches WHERE id = $1`, id)

	m := &model.Match{}
	err := row.Scan(&m.ID, &m.Player1ID, &m.Player2ID, &m.WinnerID,
		&m.Player1RatingBefore, &m.Player2RatingBefore, &m.RatingDelta,
		&m.Status, &m.BestOf, &m.CreatedAt, &m.CompletedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return m, nil
}

func (r *MatchRepo) GetByPlayerID(ctx context.Context, playerID uuid.UUID, limit int) ([]*model.Match, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, player1_id, player2_id, winner_id, player1_rating_before, player2_rating_before,
		        rating_delta, status, best_of, created_at, completed_at
		 FROM matches
		 WHERE player1_id = $1 OR player2_id = $1
		 ORDER BY created_at DESC LIMIT $2`, playerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var matches []*model.Match
	for rows.Next() {
		m := &model.Match{}
		if err := rows.Scan(&m.ID, &m.Player1ID, &m.Player2ID, &m.WinnerID,
			&m.Player1RatingBefore, &m.Player2RatingBefore, &m.RatingDelta,
			&m.Status, &m.BestOf, &m.CreatedAt, &m.CompletedAt); err != nil {
			return nil, err
		}
		matches = append(matches, m)
	}
	return matches, rows.Err()
}

func (r *MatchRepo) CompleteTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, winnerID *uuid.UUID, ratingDelta int) error {
	_, err := tx.Exec(ctx,
		`UPDATE matches SET status = 'completed', winner_id = $1, rating_delta = $2, completed_at = NOW()
		 WHERE id = $3`, winnerID, ratingDelta, id)
	return err
}
