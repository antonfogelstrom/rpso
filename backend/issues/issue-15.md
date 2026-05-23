# No health check endpoint

**Severity:** Low  
**File:** `cmd/server/main.go`  
**Lines:** 82–97

## Description

The HTTP router has no `/health`, `/readyz`, or `/livez` endpoint. This means:

- Load balancers and container orchestrators (Kubernetes, Docker Swarm, etc.) cannot perform health checks.
- There is no way to distinguish a running server from one that has a dead DB connection pool.
- Monitoring systems cannot probe the service.

The server currently only responds to API routes (`/api/register`, `/api/login`, `/api/ws`, `/api/players/*`, `/api/leaderboard`). Any request to `/` or `/health` returns a 404.

## Resolution

Add a health check endpoint:

```go
r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
    if err := pool.Ping(r.Context()); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "unavailable"})
        return
    }
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
})
```

Or use chi's built-in `chi.Heartbeat` middleware.
