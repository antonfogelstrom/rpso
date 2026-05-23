# WebSocket CheckOrigin allows all origins

**Severity:** Medium  
**File:** `internal/handler/ws.go`

## Problem

The WebSocket upgrader uses a permissive `CheckOrigin` that accepts requests from any origin:

```go
upgrader := websocket.Upgrader{
    // ...
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}
```

While the token-based auth (Sec-WebSocket-Protocol) mitigates full CSWSH (Cross-Site WebSocket Hijacking), an open `CheckOrigin` still bypasses the browser's Same-Origin Policy. If a vulnerability is ever found in the client-side code (e.g., an XSS that leaks the subprotocol token), an attacker could open WebSocket connections from any domain.

## Fix

Validate the `Origin` header against a whitelist of allowed origins. Add an `AllowedOrigins` field to `Handler` or use an environment variable:

```go
// At the top of ws.go or in handler struct
var allowedOrigins = map[string]bool{
    "http://localhost:5173": true,    // dev frontend
    "https://rpso.example.com": true, // prod frontend
}

// In HandleWebSocket
upgrader := websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    Subprotocols:    []string{"bearer-" + token},
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        if origin == "" {
            return true // allow non-browser clients
        }
        return allowedOrigins[origin]
    },
}
```

For greater flexibility, pass the allowed origins via the `Handler` struct or a configuration/env variable rather than a hardcoded map.
