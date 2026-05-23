# completeMatch called twice on forfeit/timeout — rating inflation bug

**Severity:** Critical  
**File:** `internal/game/engine.go`  
**Lines:** 142, 153, 213–221, 224–233, 235–305

## Description

When a player disconnects or times out during a round, `playRound()` calls `forfeitMatch(winner)`, which in turn calls `completeMatch(winnerID)`. After `playRound()` returns, the game loop in `Run()` exits and calls `finishMatch()`, which also calls `completeMatch(winnerID)` a **second time**.

This means:

- ELO rating is calculated and applied **twice** (both players' ratings double-adjusted).
- `match_result` messages are sent **twice** to both players.
- The database transaction runs twice:
  - `matches` status updated to `'completed'` a second time (idempotent, no harm).
  - `players.rating` updated **again** — ratings drift by another full ELO delta.
- The second transaction may fail on commit (if timings align poorly), leaving partial updates.

## Trace

```
Run()
  → playRound()
    → timeout fires / disconnect received
      → forfeitMatch(winner)
        → completeMatch(winnerID)     // FIRST call — applies ELO, persists, sends messages
      ← return
  ← loop exits (score threshold met)
  → finishMatch()
    → completeMatch(winnerID)         // SECOND call — applies ELO again, sends duplicate messages
```

## Resolution

`forfeitMatch` should **not** call `completeMatch`. It should only set the winning score to force the loop to exit, letting `finishMatch` handle completion normally. Alternatively, have `playRound` return a boolean indicating early termination and check it in `Run` to skip `finishMatch`.
