package game

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/antonfogelstrom/rpso/internal/db"
	"github.com/antonfogelstrom/rpso/internal/ws"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Engine struct {
	matchID     uuid.UUID
	p1ID        uuid.UUID
	p2ID        uuid.UUID
	p1Name      string
	p2Name      string
	p1Rating    int
	p2Rating    int
	bestOf      int
	score       [2]int
	roundNumber int
	hub         *ws.Hub
	pool        *pgxpool.Pool
	players     *db.PlayerRepo
	matches     *db.MatchRepo
	rounds      *db.RoundRepo
	moveCh      chan *ws.Message
	disconnect  chan uuid.UUID
	handle      *ws.EngineHandle
}

func NewEngine(
	matchID uuid.UUID,
	p1ID, p2ID uuid.UUID,
	p1Name, p2Name string,
	p1Rating, p2Rating int,
	bestOf int,
	hub *ws.Hub,
	pool *pgxpool.Pool,
	players *db.PlayerRepo,
	matches *db.MatchRepo,
	rounds *db.RoundRepo,
) *Engine {
	return &Engine{
		matchID:    matchID,
		p1ID:       p1ID,
		p2ID:       p2ID,
		p1Name:     p1Name,
		p2Name:     p2Name,
		p1Rating:   p1Rating,
		p2Rating:   p2Rating,
		bestOf:     bestOf,
		hub:        hub,
		pool:       pool,
		players:    players,
		matches:    matches,
		rounds:     rounds,
		moveCh:     make(chan *ws.Message, 2),
		disconnect: make(chan uuid.UUID, 2),
	}
}

func (e *Engine) Run() {
	e.handle = &ws.EngineHandle{
		MoveCh:       e.moveCh,
		DisconnectCh: e.disconnect,
	}
	e.hub.RegisterEngine(e.matchID, e.p1ID, e.p2ID, e.handle)
	defer e.hub.UnregisterEngine(e.matchID, e.p1ID, e.p2ID)

	needed := (e.bestOf / 2) + 1

	for e.score[0] < needed && e.score[1] < needed {
		e.roundNumber++
		e.playRound()
	}

	e.finishMatch()
}

func (e *Engine) playRound() {
	var p1Move, p2Move string
	var p1Done, p2Done bool

	// Move submission timeout
	timeout := time.NewTimer(30 * time.Second)
	defer timeout.Stop()

	for !p1Done || !p2Done {
		select {
		case msg := <-e.moveCh:
			var payload struct {
				Move string `json:"move"`
			}
			if err := json.Unmarshal(msg.Data, &payload); err != nil || !IsValidMove(payload.Move) {
				// Find which player sent this and send error
				e.sendError(msg, "invalid move")
				continue
			}

			// Determine which player this move is from
			client, _ := e.hub.GetClient(msg.ClientID)
			if client == nil {
				continue
			}

			switch client.PlayerID {
			case e.p1ID:
				if !p1Done {
					p1Move = payload.Move
					p1Done = true
				}
			case e.p2ID:
				if !p2Done {
					p2Move = payload.Move
					p2Done = true
				}
			}

		case playerID := <-e.disconnect:
			// Forfeit match if a player disconnects
			var winner uuid.UUID
			if playerID == e.p1ID {
				winner = e.p2ID
			} else {
				winner = e.p1ID
			}
			e.forfeitMatch(winner)
			return

		case <-timeout.C:
			// Timeout — whoever hasn't moved loses
			var winner uuid.UUID
			if !p1Done {
				winner = e.p2ID
			} else {
				winner = e.p1ID
			}
			e.forfeitMatch(winner)
			return
		}
	}

	winner := ResolveMove(p1Move, p2Move)
	var winnerID *uuid.UUID

	switch winner {
	case 1:
		e.score[0]++
		winnerID = &e.p1ID
	case 2:
		e.score[1]++
		winnerID = &e.p2ID
	default:
	}

	_, err := e.rounds.Create(context.Background(), e.matchID, e.roundNumber, p1Move, p2Move, winnerID)
	if err != nil {
		log.Printf("failed to persist round: %v", err)
	}

	e.hub.SendToPlayer(e.p1ID, map[string]interface{}{
		"type":          "round_result",
		"round":         e.roundNumber,
		"your_move":     p1Move,
		"opponent_move": p2Move,
		"result": func() string {
			if winner == 1 {
				return "win"
			} else if winner == 0 {
				return "tie"
			}
			return "loss"
		}(),
		"score": e.score[:],
	})
	e.hub.SendToPlayer(e.p2ID, map[string]interface{}{
		"type":          "round_result",
		"round":         e.roundNumber,
		"your_move":     p2Move,
		"opponent_move": p1Move,
		"result": func() string {
			if winner == 2 {
				return "win"
			} else if winner == 0 {
				return "tie"
			}
			return "loss"
		}(),
		"score": []int{e.score[1], e.score[0]},
	})
}

func (e *Engine) forfeitMatch(winner uuid.UUID) {
	winnerID := &winner

	if winner == e.p1ID {
		e.score[0] = e.bestOf/2 + 1
	} else {
		e.score[1] = e.bestOf/2 + 1
	}

	e.completeMatch(winnerID)
}

func (e *Engine) finishMatch() {
	var winnerID *uuid.UUID
	if e.score[0] > e.score[1] {
		winnerID = &e.p1ID
	} else {
		winnerID = &e.p2ID
	}

	e.completeMatch(winnerID)
}

func (e *Engine) completeMatch(winnerID *uuid.UUID) {
	ctx := context.Background()

	tx, err := e.pool.Begin(ctx)
	if err != nil {
		log.Printf("failed to begin tx for match %s: %v", e.matchID, err)
		return
	}
	defer tx.Rollback(ctx)

	var winner int
	if winnerID != nil {
		if *winnerID == e.p1ID {
			winner = 1
		} else {
			winner = 2
		}
	}
	newP1Rating, newP2Rating := CalculateELO(e.p1Rating, e.p2Rating, winner)

	ratingDelta := 0
	if winnerID != nil {
		if *winnerID == e.p1ID {
			ratingDelta = newP1Rating - e.p1Rating
		} else {
			ratingDelta = newP2Rating - e.p2Rating
		}
	}

	if _, err := tx.Exec(ctx,
		`UPDATE matches SET status = 'completed', winner_id = $1, rating_delta = $2, completed_at = NOW() WHERE id = $3`,
		winnerID, ratingDelta, e.matchID); err != nil {
		log.Printf("failed to complete match: %v", err)
		return
	}

	if _, err := tx.Exec(ctx,
		`UPDATE players SET rating = $1 WHERE id = $2`, newP1Rating, e.p1ID); err != nil {
		log.Printf("failed to update rating for %s: %v", e.p1ID, err)
		return
	}
	if _, err := tx.Exec(ctx,
		`UPDATE players SET rating = $1 WHERE id = $2`, newP2Rating, e.p2ID); err != nil {
		log.Printf("failed to update rating for %s: %v", e.p2ID, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("failed to commit match result: %v", err)
		return
	}

	winnerStr := "opponent"
	if winnerID != nil {
		if *winnerID == e.p1ID {
			winnerStr = "you"
		} else {
			winnerStr = "opponent"
		}
	}

	e.hub.SendToPlayer(e.p1ID, map[string]interface{}{
		"type":          "match_result",
		"winner":        winnerStr,
		"rating_change": newP1Rating - e.p1Rating,
		"final_score":   e.score[:],
	})
	e.hub.SendToPlayer(e.p2ID, map[string]interface{}{
		"type":          "match_result",
		"winner":        func() string { if winnerStr == "you" { return "opponent" }; return "you" }(),
		"rating_change": newP2Rating - e.p2Rating,
		"final_score":   []int{e.score[1], e.score[0]},
	})
}

func (e *Engine) sendError(msg *ws.Message, text string) {
	client, _ := e.hub.GetClient(msg.ClientID)
	if client != nil {
		client.SendJSON(map[string]interface{}{
			"type":    "error",
			"message": text,
		})
	}
}
