# No rate limiting on registration endpoint

**Severity:** Medium  
**File:** `internal/handler/register.go`

## Problem

The `POST /api/register` endpoint has no rate limiting. An attacker can:
- Create thousands of accounts in seconds to fill the database
- Perform username-squatting at scale
- Exhaust database connections with concurrent inserts

Since registration is unauthenticated (no token required), this is the most exposed endpoint.

## Fix

Add a per-IP rate limiter. A simple sliding-window or token-bucket approach is sufficient. Avoid adding external dependencies — Go's standard library and a basic map suffice.

Example using a synchronized token bucket:

```go
package handler

import (
    "net/http"
    "sync"
    "time"
)

type rateLimiter struct {
    mu       sync.Mutex
    visitors map[string]*visitor
    limit    int
    window   time.Duration
}

type visitor struct {
    count    int
    resetAt  time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
    rl := &rateLimiter{
        visitors: make(map[string]*visitor),
        limit:    limit,
        window:   window,
    }
    go rl.cleanup(time.Minute)
    return rl
}

func (rl *rateLimiter) Allow(key string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    v, ok := rl.visitors[key]
    now := time.Now()
    if !ok || now.After(v.resetAt) {
        rl.visitors[key] = &visitor{count: 1, resetAt: now.Add(rl.window)}
        return true
    }
    if v.count >= rl.limit {
        return false
    }
    v.count++
    return true
}

func (rl *rateLimiter) cleanup(interval time.Duration) {
    ticker := time.NewTicker(interval)
    for range ticker.C {
        rl.mu.Lock()
        now := time.Now()
        for ip, v := range rl.visitors {
            if now.After(v.resetAt) {
                delete(rl.visitors, ip)
            }
        }
        rl.mu.Unlock()
    }
}
```

Apply it as middleware or directly in the handler:

```go
var registerLimiter = newRateLimiter(5, time.Minute) // 5 registrations per minute per IP

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
    ip := r.RemoteAddr
    // For reverse proxies, extract from X-Forwarded-For
    // ip = r.Header.Get("X-Forwarded-For")

    if !registerLimiter.Allow(ip) {
        writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many registration attempts")
        return
    }
    // ... existing code
}
```

**Note:** For production behind a reverse proxy, extract the real client IP from the `X-Forwarded-For` or `X-Real-IP` header.
