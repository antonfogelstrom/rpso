# Issue 8: `Client.mu` Never Used

**Severity:** Low  
**File:** `internal/ws/client.go`

## Description

The `Client` struct defines a `sync.Mutex` field `mu` that is never locked or unlocked anywhere in the codebase.

```go
type Client struct {
    ID       string
    PlayerID uuid.UUID
    Username string
    conn     *websocket.Conn
    send     chan []byte
    hub      *Hub
    mu       sync.Mutex    // ← never referenced
}
```

## Impact

- Dead field adds unnecessary memory to every `Client` instance.
- Suggests an unfinished synchronization strategy — future contributors may rely on it incorrectly.

## Root Cause

The mutex was likely added preemptively during development for protecting `conn` access, but `gorilla/websocket` only allows one concurrent reader and one concurrent writer, which the read/write pump pattern already satisfies without additional locking.

## Recommendation

Remove the `mu` field entirely:

```go
type Client struct {
    ID       string
    PlayerID uuid.UUID
    Username string
    conn     *websocket.Conn
    send     chan []byte
    hub      *Hub
}
```

This also removes the `"sync"` import from the file if it's only used for this field.
