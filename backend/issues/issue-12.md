# No reconnection mechanism — WebSocket drop instantly forfeits

**Severity:** Low  
**File:** `internal/game/engine.go`  
**Lines:** 134–143

## Description

When a WebSocket connection drops for any reason (network blip, browser tab backgrounding, proxy timeout), the client unregisters from the hub and triggers an immediate disconnect notification to the game engine:

```go
case playerID := <-e.disconnect:
    var winner uuid.UUID
    if playerID == e.p1ID {
        winner = e.p2ID
    } else {
        winner = e.p1ID
    }
    e.forfeitMatch(winner)
    return
```

There is **no grace period**. Even a momentary connectivity issue results in a match forfeit, ELO loss, and a frustrating user experience. The player cannot reconnect and resume the match.

This is particularly impactful because:

- RPS matches are short (best-of-3, 30s per round), so the forfeit is effectively permanent.
- Mobile or unstable network connections are common for a casual game.
- There is no mechanism to re-associate a new WebSocket connection with an existing match.

## Resolution

Add a grace period (e.g., 10–15 seconds) before forfeiting on disconnect. During this window, the player can reconnect via a new WebSocket connection and resume the match. Track reconnections via the player's session token.
