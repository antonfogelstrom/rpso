# Issue 4: `MatchRepo.Complete` is Dead — Engine Uses Raw SQL

**Severity:** Medium  
**Files:** `internal/db/matches.go`, `internal/game/engine.go`

## Description

`MatchRepo.Complete()` is defined in `internal/db/matches.go:74` but is never called. The game engine in `engine.go:185` bypasses the repository layer and executes raw SQL directly against the pool.

Similarly, player rating updates in the engine use raw `tx.Exec(...)` calls instead of `PlayerRepo.UpdateRating()`.

## Impact

- Dead code that must be maintained.
- Inconsistent DB access patterns — some code uses repositories, some uses raw SQL.
- The repository layer cannot be relied upon for data integrity guarantees.

## Root Cause

The engine's `completeMatch()` method predates or was written without awareness of the repository methods. The engine does its own SQL because it needs to run the updates inside a single transaction, but the repo methods don't accept transactions.

## Recommendation

**Option A — Wire repo methods to accept transactions (recommended):**

Add `Tx` variants to the repos (or refactor to accept `pgx.Tx`):

```go
func (r *MatchRepo) CompleteTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, winnerID *uuid.UUID, ratingDelta int) error {
    _, err := tx.Exec(ctx, `UPDATE matches SET ...`, winnerID, ratingDelta, id)
    return err
}
```

Then have the engine use `MatchRepo.CompleteTx()` and `PlayerRepo.UpdateRatingTx()` inside its transaction.

**Option B — Remove the unused `Complete()` method** and extract the raw SQL from the engine into the repository.

**Option C — Remove the repository methods** if the engine is the only caller (not recommended — mixes concerns).
