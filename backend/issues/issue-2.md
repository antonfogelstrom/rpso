# CORS middleware allows all origins — allowedOrigins unused on REST API

**Severity:** High  
**File:** `cmd/server/main.go`  
**Lines:** 78, 146–157

## Description

The `corsMiddleware` at line 146 sets `Access-Control-Allow-Origin: *` for all HTTP responses. The `allowedOrigins` map is parsed from the `ALLOWED_ORIGINS` environment variable at line 78 but is **never passed to the CORS middleware**. It is only used by the WebSocket upgrader's `CheckOrigin` callback in `internal/handler/ws.go:48-54`.

This means any website can make authenticated CORS requests to the REST API (player profiles, match history, leaderboard). If a user's token is accessible to JavaScript (e.g., stored in `localStorage`), a malicious site can read their data.

The `ALLOWED_ORIGINS` env var is therefore misleading — it appears to configure CORS but only affects WebSocket connections.

## Resolution

Use the `allowedOrigins` map in the CORS middleware. Respond with the specific origin from the request's `Origin` header if it's in the allow list, or deny the request. Alternatively, remove the `allowedOrigins` map entirely if it's not needed and keep `*` deliberately.
