package auth

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

type sessionEntry struct {
	playerID  uuid.UUID
	expiresAt time.Time
}

type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]sessionEntry
}

func NewSessionStore() *SessionStore {
	return &SessionStore{
		sessions: make(map[string]sessionEntry),
	}
}

func (s *SessionStore) Set(token string, playerID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[token] = sessionEntry{
		playerID:  playerID,
		expiresAt: time.Now().Add(24 * time.Hour),
	}
}

func (s *SessionStore) Get(token string) (uuid.UUID, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	entry, ok := s.sessions[token]
	if !ok || time.Now().After(entry.expiresAt) {
		return uuid.UUID{}, false
	}
	return entry.playerID, true
}

func (s *SessionStore) Delete(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
}

func (s *SessionStore) Cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		s.mu.Lock()
		for token, entry := range s.sessions {
			if time.Now().After(entry.expiresAt) {
				delete(s.sessions, token)
			}
		}
		s.mu.Unlock()
	}
}
