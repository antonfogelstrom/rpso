# Username enumeration via login error messages

**Severity:** Medium  
**File:** `internal/handler/login.go`  
**Lines:** 46–52

## Description

The login endpoint returns different HTTP status codes and messages depending on whether the username exists:

- **Player not found** → `404` + `"Player not found"`
- **Token mismatch** → `401` + `"Token does not match"`

This allows an attacker to determine whether a given username is registered, simply by observing the response code. This information can be used to:

- Target known users for social engineering.
- Confirm the effectiveness of a username-guessing attack.

## Resolution

Return a generic error for both cases:

```go
writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid username or token")
```

Use the same HTTP status (401) regardless of whether the player exists or the token is wrong.
