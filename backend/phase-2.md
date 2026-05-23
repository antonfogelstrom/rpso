# Phase 2: Authentication

## Goals
- Token generation (crypto-random)
- Token hashing & verification (bcrypt)
- Auth middleware for HTTP and WebSocket

## Files

### `internal/auth/token.go`
```go
package auth

import (
    "crypto/rand"
    "encoding/hex"
    "golang.org/x/crypto/bcrypt"
)

// GenerateToken returns a cryptographically random 64-char hex string.
func GenerateToken() (string, error) {
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return hex.EncodeToString(bytes), nil
}

// HashToken returns a bcrypt hash of the token.
func HashToken(token string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(token), bcrypt.DefaultCost)
    if err != nil {
        return "", err
    }
    return string(hash), nil
}

// VerifyToken compares a token against its bcrypt hash.
func VerifyToken(token, hash string) bool {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(token)) == nil
}
```

### `internal/auth/middleware.go`
```go
package auth

// HTTP middleware:
// 1. Extract "Authorization: Bearer <token>" header
// 2. Look up player by iterating stored hashes (or use a cache)
// 3. Inject player ID into request context

// For MVP, use a simple map[uuid.UUID]string cache keyed by playerID,
// populated on register/login. On cache miss, fall through to DB.

// WS auth: extract "token" query param during handshake, verify same way.
```

## Design Decisions
- **bcrypt** for token hashing — slow but secure. Acceptable for MVP scale.
- **No token expiry or refresh** — user keeps the same token. If lost, re-register.
- **Middleware pattern**: Chi middleware checks auth for protected routes, sets `player_id` in `context.Context`.
- **Rate limiting note**: No rate limiting for MVP but good to flag.

## Edge Cases
- Malformed `Authorization` header → 401
- Token doesn't match any player → 401
- Empty username → reject at registration (handled by handler validation)
