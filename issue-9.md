# Issue 9: `SendToPlayer` Only Hits One Connection Per Player

**Severity:** Low  
**File:** `internal/ws/hub.go`

## Description

`SendToPlayer()` iterates over the `h.clients` map and returns after sending to the first matching client. Since Go map iteration order is randomized, if a player has multiple WebSocket connections open, the message is delivered to an unpredictable one.

```go
func (h *Hub) SendToPlayer(playerID uuid.UUID, msg interface{}) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    for _, client := range h.clients {
        if client.PlayerID == playerID {
            client.SendJSON(msg)
            return  // ← returns after first match
        }
    }
}
```

## Impact

- A player logged in on multiple devices/tabs will receive match updates on only one connection.
- The receiving connection is non-deterministic due to map iteration order.
- When the receiving connection disconnects (but another remains), the player stops getting updates even though they're still connected.

## Root Cause

The early `return` after finding the first match is an optimization that assumes one connection per player. There's no mechanism to restrict or deduplicate connections.

## Recommendation

**Option A — Broadcast to all connections (recommended):**

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

**Option B — Single-connection enforcement:**

Reject new WebSocket connections if a client is already connected for that player:

```go
func (h *Hub) RegisterClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    // Disconnect existing connection for this player
    for _, c := range h.clients {
        if c.PlayerID == client.PlayerID {
            close(c.send)  // triggers cleanup
            delete(h.clients, c.ID)
            break
        }
    }
    h.register <- client
}
```

This would need to be done synchronously before the read/write pumps start. Option A is simpler and more robust for MVP.
