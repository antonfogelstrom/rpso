# No per-username rate limiting on login

**Severity:** Medium  
**File:** `internal/handler/login.go`  
**Lines:** 22–63

## Description

Even if per-IP rate limiting is added to login (issue #5), an attacker could still systematically attempt tokens for a specific username by rotating through many IPs (e.g., a botnet). There is no per-username rate limiting that would throttle attempts against a single account regardless of source IP.

## Resolution

Add a second rate limiter keyed by username (in addition to the per-IP limiter). A reasonable limit would be 5–10 login attempts per username per minute. This prevents distributed brute-force attacks against high-value accounts.
