# SendToPlayer is O(n) and sends to all of a player's connections

**Severity:** High  
**File:** `internal/ws/hub.go`  
**Lines:** 144–152

## Description

`SendToPlayer` iterates over **every** connected client to find those matching a `PlayerID`:

```go
func (h *Hub) SendToPlayer(playerID uuid.UUID, msg interface{}) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    for _, client := range h.clients {
        if client.PlayerID == playerID {
            client.SendJSON(msg)
        }
    }
}
```

This has two problems:

1. **O(n) performance.** Every game event (round results, match results) requires a full scan of all connected clients. While acceptable at small scale, it does not scale.

2. **Multiple connections receive game messages.** A player with two browser tabs (or a reconnecting client) gets two copies of every `round_result`, `match_result`, etc. Both connections' `move` messages are accepted by the engine — the second is silently ignored (due to `p1Done`/`p2Done` checks in `engine.go:123-131`). This means a player's move may appear to be accepted (no error) but is not used.

## Resolution

Add a `map[uuid.UUID][]*Client` (player ID → set of clients) alongside the existing `map[string]*Client`. Query it in O(1). For game moves, track which client connection is the "active" game connection and reject moves from secondary connections with an error.
