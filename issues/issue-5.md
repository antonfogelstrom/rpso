# Player profile endpoint loads all matches to compute stats

**Severity:** Medium  
**File:** `internal/handler/player.go`

## Problem

`GetPlayerProfile` fetches every column of up to 1000 matches just to count wins and losses:

```go
matches, err := h.matches.GetByPlayerID(r.Context(), id, 1000)
// ...
for _, m := range matches {
    if m.WinnerID == nil {
        draws++
        continue
    }
    if *m.WinnerID == id {
        wins++
    } else {
        losses++
    }
}
```

For a player with thousands of games, this fetches megabytes of data (rating history, timestamps, UUIDs) across all matches when only the `winner_id` column is needed. As the user base grows, this becomes a significant performance bottleneck.

## Fix

Add dedicated query methods to `MatchRepo` that aggregate stats in SQL. This avoids transferring unnecessary data over the network.

Add to `internal/db/matches.go`:

```go
type PlayerStats struct {
    TotalMatches int
    Wins         int
    Losses       int
    Draws        int
}

func (r *MatchRepo) GetPlayerStats(ctx context.Context, playerID uuid.UUID) (*PlayerStats, error) {
    var stats PlayerStats

    row := r.pool.QueryRow(ctx,
        `SELECT COUNT(*) FROM matches
         WHERE player1_id = $1 OR player2_id = $1`, playerID)
    if err := row.Scan(&stats.TotalMatches); err != nil {
        return nil, err
    }

    row = r.pool.QueryRow(ctx,
        `SELECT COUNT(*) FROM matches WHERE winner_id = $1`, playerID)
    if err := row.Scan(&stats.Wins); err != nil {
        return nil, err
    }

    stats.Losses = stats.TotalMatches - stats.Wins // assumes winner_id is always set for completed matches
    // Or for accuracy, query draws separately:
    // `SELECT COUNT(*) FROM matches WHERE (player1_id = $1 OR player2_id = $1) AND winner_id IS NULL`

    return &stats, nil
}
```

Then update `handler/player.go` to call `GetPlayerStats` instead of fetching all matches.
