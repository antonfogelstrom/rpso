# defer cancel() inside block scope leaks contexts across rounds

**Severity:** Medium  
**File:** `internal/game/engine.go`  
**Lines:** 171–178

## Description

Inside `playRound()`, a database context is created and deferred within a `{ }` block:

```go
{
    ctx, cancel := e.dbContext()
    defer cancel()
    _, err := e.rounds.Create(ctx, e.matchNumber, p1Move, p2Move, winnerID)
    ...
}
```

In Go, `defer` is **function-scoped**, not block-scoped. The `defer cancel()` here does **not** run at the end of the `{ }` block — it runs when `playRound()` returns. Since `playRound()` is called in a loop from `Run()`, each round's `cancel` function accumulates and only fires when the match ends and `playRound()` returns for the final time.

This means:

- All round contexts remain alive simultaneously for the entire duration of the match.
- Context timers (5-second timeouts) run concurrently for each round, even after the round is complete.
- Memory is not freed promptly after each round's DB operation completes.

While not a correctness bug (the DB call completes fine, and the context is only used for that one call), it is misleading and prevents timely cleanup.

## Resolution

Replace the deferred cancel with an inline call:

```go
ctx, cancel := e.dbContext()
_, err := e.rounds.Create(ctx, e.matchNumber, p1Move, p2Move, winnerID)
cancel()
if err != nil {
    log.Printf("failed to persist round: %v", err)
}
```
