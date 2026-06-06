package matchmaking

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"github.com/antonfogelstrom/rpso/internal/db"
	"github.com/antonfogelstrom/rpso/internal/ws"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Lobby struct {
	Code       string
	CreatorPID uuid.UUID
	CreatorCID string
	Status     string
	CreatedAt  time.Time
}

type LobbyStore struct {
	mu      sync.Mutex
	lobbies map[string]*Lobby
	hub     *ws.Hub
	pool    *pgxpool.Pool
	players *db.PlayerRepo
	matches *db.MatchRepo
	rounds  *db.RoundRepo
	wg      *sync.WaitGroup
}

func NewLobbyStore(hub *ws.Hub, pool *pgxpool.Pool, players *db.PlayerRepo, matches *db.MatchRepo, rounds *db.RoundRepo, wg *sync.WaitGroup) *LobbyStore {
	return &LobbyStore{
		lobbies: make(map[string]*Lobby),
		hub:     hub,
		pool:    pool,
		players: players,
		matches: matches,
		rounds:  rounds,
		wg:      wg,
	}
}

func generateLobbyCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (ls *LobbyStore) Create(clientID string, playerID uuid.UUID) (string, error) {
	code := generateLobbyCode()
	lobby := &Lobby{
		Code:       code,
		CreatorPID: playerID,
		CreatorCID: clientID,
		Status:     "waiting",
		CreatedAt:  time.Now(),
	}
	ls.mu.Lock()
	ls.lobbies[code] = lobby
	ls.mu.Unlock()
	return code, nil
}

func (ls *LobbyStore) Join(code, clientID string, playerID uuid.UUID) error {
	ls.mu.Lock()
	lobby, ok := ls.lobbies[code]
	if !ok {
		ls.mu.Unlock()
		return fmt.Errorf("lobby not found")
	}
	if lobby.Status != "waiting" {
		ls.mu.Unlock()
		return fmt.Errorf("lobby is not available")
	}
	if lobby.CreatorPID == playerID {
		ls.mu.Unlock()
		return fmt.Errorf("cannot join your own lobby")
	}
	lobby.Status = "matched"
	ls.mu.Unlock()

	go createMatch(ls.hub, ls.pool, ls.players, ls.matches, ls.rounds, ls.wg,
		&Entry{PlayerID: lobby.CreatorPID, ClientID: lobby.CreatorCID, Username: ""},
		&Entry{PlayerID: playerID, ClientID: clientID, Username: ""},
	)
	return nil
}

func (ls *LobbyStore) Cancel(code string, playerID uuid.UUID) bool {
	ls.mu.Lock()
	defer ls.mu.Unlock()
	lobby, ok := ls.lobbies[code]
	if !ok || lobby.CreatorPID != playerID {
		return false
	}
	delete(ls.lobbies, code)
	return true
}

func (ls *LobbyStore) HandleDisconnect(playerID uuid.UUID) {
	ls.mu.Lock()
	defer ls.mu.Unlock()
	for code, lobby := range ls.lobbies {
		if lobby.CreatorPID == playerID && lobby.Status == "waiting" {
			delete(ls.lobbies, code)
			return
		}
	}
}
