# Issue 5: Token in URL Query Parameter

**Severity:** High  
**File:** `internal/handler/ws.go`

## Description

The WebSocket authentication token is passed as a URL query parameter:

```go
token := r.URL.Query().Get("token")
```

The WebSocket URL becomes: `ws://example.com/api/ws?token=<plaintext_token>`

## Impact

- **Server logs** — URLs are logged by proxies, load balancers, and application servers. The token is persisted in plaintext.
- **Browser history** — If the WebSocket URL appears in an error or is constructed client-side, it may end up in browser history.
- **Referer header** — The full URL (with token) can leak via the `Referer` header when navigating away or loading subresources.
- **TLS** — While the connection is encrypted, the URL path + query is visible to any intermediary terminating TLS.

## Root Cause

Query parameters were chosen for simplicity during MVP development.

## Recommendation

Use a standard header for authentication:

**Option A — `Authorization` header (not possible with browser WebSocket API):**
The browser `WebSocket` constructor does not support custom headers. You cannot set `Authorization` on a browser-initiated WebSocket.

**Option B — `Sec-WebSocket-Protocol` header (recommended):**

Server-side, read the token from the protocol negotiation header:

```go
protocols := websocket.Subprotocols(r)
// Expect client to send: Sec-WebSocket-Protocol: bearer-<token>
```

Client-side:
```js
const ws = new WebSocket("ws://example.com/api/ws", "bearer-" + token);
```

Then in the upgrade:
```go
upgrader := websocket.Upgrader{
    Subprotocols: []string{"bearer-" + token},
    CheckOrigin:  func(r *http.Request) bool { return true },
}
conn, err := upgrader.Upgrade(w, r, nil)
```

This keeps the token out of the URL path entirely.

**Option C — Token in first message after connect:**
Have the client connect without auth, then immediately send a JSON message with the token. The server drops the connection if no valid token arrives within a timeout.
