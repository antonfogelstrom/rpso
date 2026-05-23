# Matchmaking queue is pure FIFO — no skill-based matching

**Severity:** Low  
**File:** `internal/matchmaking/queue.go`  
**Lines:** 42–69

## Description

The matchmaking queue pairs players strictly in FIFO (first-in, first-out) order without considering player skill ratings:

```go
p1 := q.entries[0]
p2 := q.entries[1]
q.entries = q.entries[2:]
```

This means a new player (rating 1000) can be matched against the highest-rated player on the server. While the ELO system will eventually correct ratings, this has downsides:

- New players face immediate discouragement from repeated losses to highly skilled opponents.
- High-rated players gain minimal ELO from beating low-rated opponents, making matches unrewarding.
- Large rating swings create rating volatility, making the leaderboard less stable.
- Players have no incentive to queue if matches are consistently unbalanced.

## Resolution

Implement skill-based matching within a rating tolerance (e.g., ±200 ELO). If no close match is found within a timeout period, expand the tolerance. This keeps matches fair while preventing excessive queue times.
