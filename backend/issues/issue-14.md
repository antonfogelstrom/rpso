# No graceful shutdown for engine goroutines

**Severity:** Low  
**File:** `cmd/server/main.go`  
**Lines:** 116–127

## Description

When the server receives `SIGINT` or `SIGTERM`, it shuts down the HTTP server gracefully but does **not** track or await the game engine goroutines:

```go
if err := srv.Shutdown(shutdownCtx); err != nil {
    log.Fatalf("server shutdown error: %v", err)
}
pool.Close() // deferred from line 40
```

The engine goroutines (spawned by `queue.go:137: go eng.Run()`) are fire-and-forget. During shutdown:

- An engine may be mid-DB-transaction when the pool is closed, causing incomplete writes.
- Engines writing to `hub.SendToPlayer` may panic if the hub's internal maps are being torn down.
- Active matches are silently terminated with no notification to players.

The engines have no access to a shutdown context and no way to know the server is stopping.

## Resolution

Use a `sync.WaitGroup` or a context-based approach to track running engines. On shutdown, cancel the shared context, notify players that the server is restarting, and wait for engines to complete (or time out).
