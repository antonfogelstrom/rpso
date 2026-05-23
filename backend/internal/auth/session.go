package auth

import (
	"sync"

	"github.com/google/uuid"
)

type SessionStore struct {
	mu    sync.RWMutex
	token map[string]uuid.UUID // token -> playerID
}

func NewSessionStore() *SessionStore {
	return &SessionStore{
		token: make(map[string]uuid.UUID),
	}
}

func (s *SessionStore) Set(token string, playerID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.token[token] = playerID
}

func (s *SessionStore) Get(token string) (uuid.UUID, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.token[token]
	return id, ok
}

func (s *SessionStore) Delete(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.token, token)
}
