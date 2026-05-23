# Token echoed in WebSocket response headers

**Severity:** Medium  
**File:** `internal/handler/ws.go`  
**Lines:** 44–47

## Description

When upgrading a WebSocket connection, the upgrader's `Subprotocols` field is set to include the bearer token:

```go
upgrader := websocket.Upgrader{
    ...
    Subprotocols: []string{"bearer-" + token},
    ...
}
```

The Gorilla WebSocket library echoes back the chosen subprotocol in the `Sec-WebSocket-Protocol` response header. This means the **raw authentication token appears in HTTP response headers**, where it could be:

- Logged by reverse proxies, load balancers, or API gateways.
- Captured by browser dev tools, network inspectors, or server access logs.
- Exposed in any intermediary that logs headers.

## Resolution

Do not include the token in the `Subprotocols` response. Instead, use the `Sec-WebSocket-Protocol` header only for the initial authentication (read-only), and omit it from the upgrader's `Subprotocols` field so the server does not echo it back:

```go
upgrader := websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin:     ...,
}
```
