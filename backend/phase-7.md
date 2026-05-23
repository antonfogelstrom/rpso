# Phase 7: Main Entrypoint

## Goals
- Wire together all components
- Start HTTP server
- Graceful shutdown

## File: `cmd/server/main.go`

### Structure
```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/joho/godotenv"

    "github.com/<user>/rpso-backend/internal/handler"
    "github.com/<user>/rpso-backend/internal/matchmaking"
    "github.com/<user>/rpso-backend/internal/ws"
)
```

### Initialization Order
```go
func main() {
    // 1. Load .env (dev only)
    godotenv.Load()

    // 2. DB pool
    ctx := context.Background()
    pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
    if err != nil { log.Fatal(err) }
    defer pool.Close()

    // 3. Run migrations (optional — embed or exec SQL files)
    // runMigrations(pool)

    // 4. WebSocket hub
    hub := ws.NewHub()
    go hub.Run()

    // 5. Matchmaking queue
    queue := matchmaking.NewQueue(hub, pool)
    hub.SetMatchmakingQueue(queue)

    // 6. HTTP router
    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.Timeout(30 * time.Second))

    // 7. Register routes
    h := handler.New(pool, hub)
    r.Post("/api/register", h.Register)
    r.Post("/api/login", h.Login)
    r.Get("/api/players/{id}", h.GetPlayerProfile)
    r.Get("/api/players/{id}/matches", h.GetPlayerMatches)
    r.Get("/api/leaderboard", h.GetLeaderboard)
    r.Get("/api/ws", h.HandleWebSocket)

    // 8. Start server
    port := os.Getenv("PORT")
    if port == "" { port = "8080" }
    srv := &http.Server{Addr: ":" + port, Handler: r}

    go func() {
        log.Printf("server listening on :%s", port)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    // 9. Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("shutting down...")
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
    pool.Close()
}
```

### Handler Constructor
```go
// internal/handler/handler.go
type Handler struct {
    pool *pgxpool.Pool
    hub  *ws.Hub
}

func New(pool *pgxpool.Pool, hub *ws.Hub) *Handler {
    return &Handler{pool: pool, hub: hub}
}
```

## Migration Runner (optional helper)
```go
// Read migrations/*.sql files, execute in order.
// For production, consider a migration tool (golang-migrate, goose).
// For MVP, run SQL manually against Supabase and skip auto-migration.
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Supabase PostgreSQL connection string |
| `PORT` | `8080` | HTTP server port |
| `ALLOWED_ORIGINS` | `*` | CORS origins (for WS upgrade) |

## Shutdown Sequence
1. Stop accepting new connections (HTTP server shutdown)
2. Drain WebSocket hub (notify clients, close connections)
3. Abandon matchmaking queue (in-memory, lost on restart)
4. Close DB pool
5. Exit

## CORS (for web client)
```go
r.Use(corsMiddleware)

func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
        if r.Method == "OPTIONS" {
            w.WriteHeader(204)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

## Testing Strategy
- **Unit**: `internal/game` (move resolution, ELO), `internal/auth` (token gen/verify)
- **Integration**: `internal/db` against test Postgres; `internal/handler` with `httptest.Server`
- **WS integration**: Connect to `httptest.Server` with `gorilla/websocket.Dial`, simulate match flow
- **Smoke**: curl register/login, websocat for WS, play a match manually
