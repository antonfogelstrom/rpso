# Phase 4: WebSocket Layer

## Goals
- WebSocket upgrade endpoint
- Client connection management (read/write pumps)
- Hub for message routing

## Architecture

```
Client ──WS──▶ ws.Hub ──▶ matchmaking.Queue
                  │
                  ▼
              game.Engine (per match goroutine)
```

## Files

### `internal/ws/message.go`
```go
package ws

import "github.com/google/uuid"

type Message struct {
    Type     string          `json:"type"`
    ClientID uuid.UUID      `json:"-"`
    Data     json.RawMessage `json:"data,omitempty"`
}
```

### `internal/ws/client.go`
```go
type Client struct {
    ID       uuid.UUID
    PlayerID uuid.UUID
    Conn     *websocket.Conn
    Send     chan []byte
    Hub      *Hub
    mu       sync.Mutex
}
```

**Methods:**
- `ReadPump()` — goroutine reading JSON messages from WebSocket; sends to `Hub.Incoming`.
  - Set `SetReadLimit(4096)`, `SetReadDeadline(60s)`, `SetPongHandler`.
- `WritePump()` — goroutine draining `Send` channel; writes JSON to WebSocket.
  - `SetWriteDeadline(10s)` per write.
  - Close on hub unregister.
- `SendJSON(v interface{})` — marshal `v` and push to `Send` channel.

**ReadPump message dispatch:**
- `join_queue` → hub routes to matchmaking
- `leave_queue` → hub routes to matchmaking
- `move` → hub routes to the client's active match engine

### `internal/ws/hub.go`
```go
type Hub struct {
    clients    map[uuid.UUID]*Client
    register   chan *Client
    unregister chan *Client
    incoming   chan *Message
    mu         sync.RWMutex
}
```

**Methods:**
- `Run()` — main select loop:
  - `register`: add client to map, notify matchmaking (optional: player came online)
  - `unregister`: remove client from map, notify matchmaking (leave queue), notify game engine (disconnect)
  - `incoming`: route message based on `Type`
- `SendToClient(clientID, msg)` — thread-safe send
- `SendToPlayer(playerID, msg)` — find client by player ID and send
- `GetClient(playerID)` — find active client for a player (handles reconnect)

### `internal/handler/ws.go`
- HTTP handler for `GET /api/ws`
- Extract `?token=` query param
- Authenticate via auth middleware
- Upgrade connection using `gorilla/websocket.Upgrader`
- Create `Client`, register with `Hub`
- Launch `ReadPump()` and `WritePump()` goroutines

## Edge Cases
- **Client disconnect mid-match**: Hub notifies game engine which starts forfeit timer.
- **Client reconnects during match**: Hub replaces old client reference; engine uses new client for sends.
- **Concurrent writes**: Mutex-protected `WriteJSON` to avoid gorilla panics on concurrent write.
- **Malformed JSON from client**: Log, send error message, continue reading.
- **Ping/pong**: Server sends ping every 30s; client must pong within 10s or connection is closed.
