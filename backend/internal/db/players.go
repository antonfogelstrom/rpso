package db

import (
	"context"

	"github.com/antonfogelstrom/rpso/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PlayerRepo struct {
	pool *pgxpool.Pool
}

func NewPlayerRepo(pool *pgxpool.Pool) *PlayerRepo {
	return &PlayerRepo{pool: pool}
}

func (r *PlayerRepo) Create(ctx context.Context, username, tokenHash string) (*model.Player, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO players (username, token_hash) VALUES ($1, $2)
		 RETURNING id, username, token_hash, rating, created_at`,
		username, tokenHash)

	p := &model.Player{}
	err := row.Scan(&p.ID, &p.Username, &p.TokenHash, &p.Rating, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *PlayerRepo) GetByUsername(ctx context.Context, username string) (*model.Player, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, username, token_hash, rating, created_at FROM players WHERE username = $1`,
		username)

	p := &model.Player{}
	err := row.Scan(&p.ID, &p.Username, &p.TokenHash, &p.Rating, &p.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return p, nil
}

func (r *PlayerRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Player, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, username, token_hash, rating, created_at FROM players WHERE id = $1`,
		id)

	p := &model.Player{}
	err := row.Scan(&p.ID, &p.Username, &p.TokenHash, &p.Rating, &p.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return p, nil
}

func (r *PlayerRepo) UpdateRatingTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, newRating int) error {
	_, err := tx.Exec(ctx,
		`UPDATE players SET rating = $1 WHERE id = $2`, newRating, id)
	return err
}

func (r *PlayerRepo) UpdateToken(ctx context.Context, id uuid.UUID, tokenHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE players SET token_hash = $1 WHERE id = $2`, tokenHash, id)
	return err
}

func (r *PlayerRepo) UpdateRating(ctx context.Context, id uuid.UUID, newRating int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE players SET rating = $1 WHERE id = $2`, newRating, id)
	return err
}

func (r *PlayerRepo) GetLeaderboard(ctx context.Context, limit int) ([]*model.Player, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, username, token_hash, rating, created_at
		 FROM players ORDER BY rating DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []*model.Player
	for rows.Next() {
		p := &model.Player{}
		if err := rows.Scan(&p.ID, &p.Username, &p.TokenHash, &p.Rating, &p.CreatedAt); err != nil {
			return nil, err
		}
		players = append(players, p)
	}
	return players, rows.Err()
}
