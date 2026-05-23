# Issue 3: `createMatch` Transaction is a No-op

**Severity:** Critical  
**File:** `internal/matchmaking/queue.go`

## Description

In `createMatch()`, a database transaction is started but the match creation call uses `context.Background()` instead of the transaction's context. The insert happens outside the transaction, and the transaction commits immediately after with nothing in it.

```go
tx, err := q.pool.Begin(ctx)
if err != nil { ... }
defer tx.Rollback(ctx)       // rolls back an empty tx

m, err := q.matches.Create(ctx, ...)  // ctx is context.Background, NOT tx

if err := tx.Commit(ctx); err != nil { ... }  // commits nothing
```

## Impact

- No atomicity — if the match insert succeeds but subsequent operations fail, the match is orphaned.
- The transaction exists only for show and provides no data integrity guarantees.

## Root Cause

The `MatchRepo.Create()` method takes a `context.Context` but always operates on `r.pool` (the pool's direct connection), never on a transaction. To use a transaction, the method would need to accept a `pgx.Tx` or the caller would need to run the INSERT SQL directly against the transaction.

## Recommendation

**Option A — Make `Create` accept a transaction (recommended):**

Change the signature to accept a `pgx.Tx`:

```go
func (r *MatchRepo) Create(ctx context.Context, tx pgx.Tx, p1ID, p2ID uuid.UUID, ...) (*model.Match, error) {
    row := tx.QueryRow(ctx, `INSERT INTO matches ...`, ...)
    // ...
}
```

Then in `createMatch`:

```go
m, err := q.matches.Create(ctx, tx, p1.PlayerID, p2.PlayerID, 3, player1.Rating, player2.Rating)
```

**Option B — Remove the transaction entirely** if atomicity is not required (not recommended).
