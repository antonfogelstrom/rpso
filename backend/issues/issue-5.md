# No rate limiting on login endpoint

**Severity:** Medium  
**File:** `internal/handler/login.go`  
**Lines:** 22–63

## Description

The registration endpoint (`/api/register`) is rate-limited to 5 requests per minute per IP (register.go:17). The login endpoint (`/api/login`) has **no rate limiting** at all.

While tokens are cryptographically strong (256-bit random, 64 hex chars), the absence of login rate limiting:

- Allows unlimited brute-force attempts against a known username.
- Removes a defense-in-depth layer.
- Could be used for denial-of-service by exhausting DB connection pool with repeated lookups.

## Resolution

Apply a rate limiter to the login handler, both per-IP and per-username. Use a more generous limit than registration (e.g., 20 per minute per IP, 5 per minute per username).
