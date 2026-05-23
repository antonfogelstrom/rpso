# Rate limiter uses r.RemoteAddr instead of X-Forwarded-For

**Severity:** Medium  
**File:** `internal/handler/register.go`  
**Lines:** 31–32

## Description

The registration rate limiter keys off `r.RemoteAddr`:

```go
ip := r.RemoteAddr
if !registerLimiter.Allow(ip) {
    writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", ...)
    return
}
```

When the server is deployed behind a reverse proxy (e.g., nginx, Cloudflare, AWS ALB), `r.RemoteAddr` always contains the proxy's IP address, not the end user's IP. This means:

- All users behind the same proxy share a single rate limit bucket.
- A single malicious user can exhaust the shared limit, blocking all other users behind that proxy.
- The rate limiter becomes effectively useless in production.

## Resolution

Use the `X-Forwarded-For` header (or `X-Real-IP`) when available, falling back to `RemoteAddr`. For example:

```go
func realIP(r *http.Request) string {
    if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
        parts := strings.Split(fwd, ",")
        return strings.TrimSpace(parts[0])
    }
    if real := r.Header.Get("X-Real-IP"); real != "" {
        return real
    }
    return r.RemoteAddr
}
```
