# Issue 6: No Session Expiry / Token Rotation

**Severity:** Medium  
**File:** `internal/auth/session.go`

## Description

The `SessionStore` is an in-memory `map[string]uuid.UUID` with no TTL, no eviction, and no size limit. Once a token is stored, it is valid forever until the server restarts or the entry is explicitly deleted.

## Impact

- A leaked bearer token can be used indefinitely to impersonate the player.
- No mechanism for password rotation or forced re-authentication.
- Map grows unboundedly as new users register — memory leak over time.
- No way to revoke all sessions for a user (e.g., on password reset).

## Root Cause

The session store was implemented as a simple MVP map without considering lifecycle management.

## Recommendation

**Option A — Add TTL to entries (recommended for MVP):**

```go
type sessionEntry struct {
    playerID  uuid.UUID
    expiresAt time.Time
}

type SessionStore struct {
    mu        sync.RWMutex
    sessions  map[string]sessionEntry
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
```

**Option B — Eliminate the session store entirely:**

Since the token hash is already stored in the database, every request can verify the token against the DB directly:

```go
func (h *Handler) authenticate(token string) (*model.Player, error) {
    // Find player by token hash — requires a DB index on token_hash
    return h.players.GetByTokenHash(context.Background(), hashToken(token))
}
```

This eliminates the in-memory store, provides persistence across restarts, and allows per-user token revocation. Add a `token_hash` index and a `GetByTokenHash` query to the player repo.

**Option C — Add periodic cleanup goroutine:**

```go
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
```
