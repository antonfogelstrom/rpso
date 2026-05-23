package matchmaking

import (
	"context"
	"log"
	"sync"

	"github.com/antonfogelstrom/rpso/internal/db"
	"github.com/antonfogelstrom/rpso/internal/game"
	"github.com/antonfogelstrom/rpso/internal/ws"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Entry struct {
	PlayerID uuid.UUID
	ClientID string
	Username string
}

type Queue struct {
	mu      sync.Mutex
	entries []*Entry
	hub     *ws.Hub
	pool    *pgxpool.Pool
	players *db.PlayerRepo
	matches *db.MatchRepo
	rounds  *db.RoundRepo
}

func NewQueue(hub *ws.Hub, pool *pgxpool.Pool, players *db.PlayerRepo, matches *db.MatchRepo, rounds *db.RoundRepo) *Queue {
	return &Queue{
		hub:     hub,
		pool:    pool,
		players: players,
		matches: matches,
		rounds:  rounds,
	}
}

func (q *Queue) Join(entry *Entry) string {
	q.mu.Lock()

	for _, e := range q.entries {
		if e.PlayerID == entry.PlayerID {
			q.mu.Unlock()
			return "already in queue"
		}
	}

	q.entries = append(q.entries, entry)

	if len(q.entries) < 2 {
		q.mu.Unlock()
		q.hub.SendToClient(entry.ClientID, map[string]interface{}{
			"type":     "queue_status",
			"position": 1,
		})
		return ""
	}

	p1 := q.entries[0]
	p2 := q.entries[1]
	q.entries = q.entries[2:]
	q.mu.Unlock()

	go q.createMatch(p1, p2)
	return ""
}

func (q *Queue) Leave(playerID uuid.UUID) {
	q.mu.Lock()
	defer q.mu.Unlock()

	for i, e := range q.entries {
		if e.PlayerID == playerID {
			q.entries = append(q.entries[:i], q.entries[i+1:]...)
			return
		}
	}
}

func (q *Queue) createMatch(p1, p2 *Entry) {
	ctx := context.Background()

	player1, err := q.players.GetByID(ctx, p1.PlayerID)
	if err != nil {
		log.Printf("failed to get player %s: %v", p1.PlayerID, err)
		q.notifyError(p1, p2, "server error")
		return
	}
	player2, err := q.players.GetByID(ctx, p2.PlayerID)
	if err != nil {
		log.Printf("failed to get player %s: %v", p2.PlayerID, err)
		q.notifyError(p1, p2, "server error")
		return
	}

	tx, err := q.pool.Begin(ctx)
	if err != nil {
		log.Printf("failed to begin transaction: %v", err)
		q.notifyError(p1, p2, "server error")
		return
	}
	defer tx.Rollback(ctx)

	m, err := q.matches.Create(ctx, p1.PlayerID, p2.PlayerID, 3, player1.Rating, player2.Rating)
	if err != nil {
		log.Printf("failed to create match: %v", err)
		q.notifyError(p1, p2, "server error")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("failed to commit transaction: %v", err)
		q.notifyError(p1, p2, "server error")
		return
	}

	q.hub.SendToClient(p1.ClientID, map[string]interface{}{
		"type":            "match_found",
		"match_id":        m.ID.String(),
		"opponent":        player2.Username,
		"opponent_rating": player2.Rating,
	})
	q.hub.SendToClient(p2.ClientID, map[string]interface{}{
		"type":            "match_found",
		"match_id":        m.ID.String(),
		"opponent":        player1.Username,
		"opponent_rating": player1.Rating,
	})

	eng := game.NewEngine(m.ID, p1.PlayerID, p2.PlayerID, player1.Username, player2.Username,
		player1.Rating, player2.Rating, 3, q.hub, q.pool, q.players, q.matches, q.rounds)
	go eng.Run()
}

func (q *Queue) notifyError(p1, p2 *Entry, msg string) {
	q.hub.SendToClient(p1.ClientID, map[string]interface{}{
		"type":    "error",
		"message": msg,
	})
	q.hub.SendToClient(p2.ClientID, map[string]interface{}{
		"type":    "error",
		"message": msg,
	})
}
