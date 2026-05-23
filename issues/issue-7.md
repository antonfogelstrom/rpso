# Context.Background() used throughout engine — no timeouts

**Severity:** Medium  
**Files:** `internal/game/engine.go`, `internal/matchmaking/queue.go`

## Problem

All database operations in the game engine and matchmaking queue use `context.Background()` with no timeout:

- `engine.go:161` — `e.rounds.Create(context.Background(), ...)`
- `engine.go:224` — `e.pool.Begin(context.Background())`
- `queue.go:99` — `q.pool.Begin(context.Background())`
- `queue.go:86` — `q.players.GetByID(context.Background(), ...)`

If the database becomes slow or unavailable, these calls can hang indefinitely. The engine goroutine will block forever, leaking memory and preventing the match from completing or being cleaned up.

## Fix

Create a context with a timeout for each operation, or derive one from a fixed deadline. For engine operations, a 5-second timeout is reasonable (these are short transactional operations).

In `internal/game/engine.go`, add a helper:

```go
func (e *Engine) dbContext() (context.Context, context.CancelFunc) {
    return context.WithTimeout(context.Background(), 5*time.Second)
}
```

Then replace all `context.Background()` calls:

```go
// Before
e.rounds.Create(context.Background(), e.matchID, ...)

// After
ctx, cancel := e.dbContext()
defer cancel()
e.rounds.Create(ctx, e.matchID, ...)
```

Apply the same pattern in `internal/matchmaking/queue.go`:

```go
func (q *Queue) createMatch(p1, p2 *Entry) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    // ... use ctx for all DB calls
}
```

For transactions (`Begin` + `Commit`), use a single context for the entire transaction lifecycle to ensure the full operation has a bounded deadline.
