# Dead code: db.NewPool function is unused

**Severity:** Medium  
**File:** `internal/db/pool.go`  
**Lines:** 1–22

## Description

The `NewPool` function in `pool.go` creates a `pgxpool.Pool` with a ping check:

```go
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
    cfg, err := pgxpool.ParseConfig(databaseURL)
    ...
}
```

However, `main.go` does not use this function. Instead, it calls `pgxpool.New` directly at line 36 and performs its own ping at line 42:

```go
pool, err := pgxpool.New(ctx, databaseURL)
...
if err := pool.Ping(ctx); err != nil { ... }
```

This means the `NewPool` function is entirely dead code. It creates a maintenance burden (it must be kept in sync with actual pool configuration) and misleads readers into thinking it is the intended way to create a pool.

## Resolution

**Option A:** Delete `pool.go` entirely since `main.go` handles pool creation directly.

**Option B:** Refactor `main.go` to use `db.NewPool()` and remove the inline pool setup.
