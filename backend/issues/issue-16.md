# winnerStr logic is fragile and confusing

**Severity:** Low  
**File:** `internal/game/engine.go`  
**Lines:** 284–303

## Description

The `winnerStr` is computed once from player 1's perspective, then a closure in the player 2 message flips it:

```go
winnerStr := "opponent"
if winnerID != nil {
    if *winnerID == e.p1ID {
        winnerStr = "you"
    } else {
        winnerStr = "opponent"
    }
}

e.hub.SendToPlayer(e.p1ID, map[string]interface{}{
    "type":   "match_result",
    "winner": winnerStr,
    ...
})
e.hub.SendToPlayer(e.p2ID, map[string]interface{}{
    "type":   "match_result",
    "winner": func() string { if winnerStr == "you" { return "opponent" }; return "you" }(),
    ...
})
```

This is fragile because:

- Any change to the winner computation for P1 must be manually mirrored for P2.
- The closure approach is hard to read and easy to get wrong.
- If a draw is possible (winnerID is nil), the closure logic produces incorrect results: `winnerStr` is `"opponent"`, and the closure returns `"you"` for P2, even though nobody won.

## Resolution

Compute the winner string independently for each player:

```go
p1Winner := "opponent"
p2Winner := "opponent"
if winnerID != nil {
    if *winnerID == e.p1ID {
        p1Winner = "you"
    } else {
        p2Winner = "you"
    }
}
```
