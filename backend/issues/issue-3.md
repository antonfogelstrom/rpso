# Goroutine leak on disconnect after engine exits

**Severity:** High  
**Files:** `internal/ws/hub.go:60-62`, `internal/game/engine.go:63`

## Description

When a WebSocket client disconnects while in an active match, `hub.go` spawns a goroutine to notify the game engine:

```go
go func(pid uuid.UUID) {
    eng.DisconnectCh <- pid
}(client.PlayerID)
```

The `DisconnectCh` channel has a buffer of 2 (from `engine.go:63`). If the game engine has **already finished** (both players moved all rounds, or a prior disconnect forfeited the match), `UnregisterEngine` will have already been called, removing the engine from `h.engines`. However, there is a race window:

1. Disconnect goroutine checks `h.engines[matchID]` — engine exists.
2. Engine finishes concurrently, calls `UnregisterEngine`, and stops reading `DisconnectCh`.
3. Goroutine tries to send to `DisconnectCh` — **blocks forever** because no receiver remains.

Since each player can disconnect, up to **two goroutines can leak** per stale disconnect race. Over time, this consumes memory and goroutine stack space.

## Resolution

Use a non-blocking send in the goroutine:

```go
go func(pid uuid.UUID) {
    select {
    case eng.DisconnectCh <- pid:
    default:
    }
}(client.PlayerID)
```

This ensures the goroutine exits immediately if the channel has no reader.
