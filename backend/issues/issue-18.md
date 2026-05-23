# No structured logging

**Severity:** Low  
**File:** Entire project

## Description

The entire codebase uses the standard `log.Printf` and `log.Fatalf` for all logging. This produces unstructured text output with no consistent format:

```
no .env file found, using environment variables
connected to database
server listening on :8080
client abc123 connected (player xyz789)
shutting down...
```

In production, this makes it difficult to:

- Filter logs by severity level (info, warn, error).
- Search for events related to a specific player or match.
- Integrate with structured logging systems (ELK, Datadog, Grafana Loki, etc.).
- Add contextual fields (request ID, player ID, match ID, duration) without string interpolation.

## Resolution

Adopt a structured logging library such as `log/slog` (standard library, Go 1.21+), `go.uber.org/zap`, or `github.com/rs/zerolog`. Migrate from:

```go
log.Printf("client %s connected (player %s)", client.ID, client.PlayerID)
```

to:

```go
slog.Info("client connected", "client_id", client.ID, "player_id", client.PlayerID)
```

This enables log aggregation, structured querying, and consistent field naming.
