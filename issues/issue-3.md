# No request body size limits

**Severity:** High  
**Files:** `internal/handler/register.go`, `internal/handler/login.go`

## Problem

All handlers use `json.NewDecoder(r.Body).Decode(&req)` without wrapping the request body in `http.MaxBytesReader`. An attacker can send arbitrarily large payloads to exhaust server memory.

The affected endpoints are:
- `POST /api/register` (`register.go:27`)
- `POST /api/login` (`login.go:23`)

## Fix

Wrap `r.Body` with `http.MaxBytesReader` before decoding. A reasonable limit for these endpoints is 1 KB (since the payloads are tiny).

In `register.go`:
```go
r.Body = http.MaxBytesReader(w, r.Body, 1024)
var req registerRequest
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
    return
}
```

Apply the same pattern in `login.go`.

`http.MaxBytesReader` returns an `*http.MaxBytesError` when the limit is exceeded. The `json.Decoder` will return this error, which can be checked if a more specific error message is desired:

```go
var maxBytesErr *http.MaxBytesError
if errors.As(err, &maxBytesErr) {
    writeError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "Request body too large")
    return
}
```
