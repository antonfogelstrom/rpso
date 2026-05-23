# Stale disconnect events cause incorrect forfeits across rounds

**Severity:** Medium  
**File:** `internal/game/engine.go`

## Problem

The `disconnect` channel is shared across all rounds of a match but is only drained when the engine's select loop reads it. If both players submit moves in round N and the loop exits normally before reading a pending disconnect event, that stale event is consumed in round N+1, causing a false forfeit.

### Reproduction

Best-of-3 match (need 2 wins):
1. Round 1: both players move, resolved normally. Score 1-0.
2. Round 2: p2 disconnects, then both players move before the select reads the disconnect. The loop exits (both done), leaving the disconnect event in the channel.
3. Round 3: the select loop immediately reads the stale disconnect and forfeits p2 — even though the disconnect happened in round 2 and both players already moved in that round.

## Fix

Drain the disconnect channel at the start of each `playRound()` call to remove any stale events from prior rounds:

```go
func (e *Engine) playRound() {
    // Drain any stale disconnect events from previous rounds
    select {
    case <-e.disconnect:
    default:
    }
    // ... rest of function
}
```

This non-blocking select drains at most one stale event. Since only one player can disconnect per round, a single drain is sufficient. If both players disconnected, a second stale event would be drained at the start of the next round (which would correctly trigger a forfeit anyway).
