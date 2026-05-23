# Phase 5: Matchmaking

## Goals
- FIFO queue for auto-matchmaking
- Match creation when two players are in queue
- Leave queue support

## Design
- Single global in-memory queue (no rating tiers for MVP)
- Channel-based notification: when a player joins, immediately try to match
- On server restart, queue is lost (acceptable for MVP)

## Files

### `internal/matchmaking/queue.go`
```go
package matchmaking

type PlayerEntry struct {
    PlayerID  uuid.UUID
    ClientID  uuid.UUID
    Username  string
    EnteredAt time.Time
    Respond   chan<- MatchResult  // optional: for synchronous match response
}

type Queue struct {
    mu      sync.Mutex
    entries []*PlayerEntry  // FIFO
    hub     *ws.Hub
    pool    *pgxpool.Pool
}

type MatchResult struct {
    MatchID  uuid.UUID
    Opponent PlayerEntry
}
```

### Methods

**`Join(entry *PlayerEntry)`**
1. Lock mutex
2. Check player is not already in queue → return error if so
3. Append to `entries`
4. If `len(entries) >= 2`:
   a. Dequeue first two entries (pop front twice)
   b. Unlock mutex (don't hold lock during DB call)
   c. Call `createMatch(p1, p2)`
5. Else: unlock, send `queue_status` to joiner (position = len)

**`Leave(playerID uuid.UUID, clientID uuid.UUID)`**
1. Lock mutex
2. Remove matching entry from slice
3. Unlock
4. No notification needed (player voluntarily left)

**`createMatch(p1, p2 *PlayerEntry) (uuid.UUID, error)`**
1. Open DB transaction (serializable isolation)
2. Read current ratings of both players
3. Insert match row with `status = 'active'`
4. Commit transaction
5. Send `match_found` to both clients via hub:
   ```json
   {
     "type": "match_found",
     "match_id": "...",
     "opponent": "bob",
     "opponent_rating": 1000
   }
   ```
6. Spawn a new `game.Engine` goroutine for this match

## Edge Cases
- **Player disconnects while in queue**: Hub unregister → call `Queue.Leave()`.
- **Two players join at nearly the same time**: Mutex ensures atomic check-and-dequeue.
- **DB error during match creation**: Notify both players of error, they remain in queue or get re-queued.
- **Player joins while already in a match**: Reject with error message via WS.
