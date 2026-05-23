# Magic number 3 for bestOf is hardcoded

**Severity:** Low  
**File:** `internal/matchmaking/queue.go`  
**Lines:** 109, 135

## Description

The value `3` (for best-of-3 matches) appears as a magic number in two places in `queue.go`:

```go
m, err := q.matches.Create(ctx, tx, p1.PlayerID, p2.PlayerID, 3, player1.Rating, player2.Rating)
...
eng := game.NewEngine(m.ID, p1.PlayerID, p2.PlayerID, player1.Username, player2.Username,
    player1.Rating, player2.Rating, 3, q.hub, q.pool, q.players, q.matches, q.rounds)
```

This makes the code harder to maintain:

- To change match length (e.g., best-of-5), both occurrences must be updated.
- A reader cannot tell whether these are the same parameter or coincidentally equal.
- There is no single source of truth for match configuration.

## Resolution

Define a named constant:

```go
const DefaultBestOf = 3
```

Use `DefaultBestOf` everywhere the value is needed. This makes the intent clear and allows easy configuration changes.
