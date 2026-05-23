package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/antonfogelstrom/rpso/internal/auth"
	"github.com/antonfogelstrom/rpso/internal/db"
	"github.com/antonfogelstrom/rpso/internal/handler"
	"github.com/antonfogelstrom/rpso/internal/matchmaking"
	"github.com/antonfogelstrom/rpso/internal/ws"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	ctx := context.Background()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}
	log.Println("connected to database")

	playerRepo := db.NewPlayerRepo(pool)
	matchRepo := db.NewMatchRepo(pool)
	roundRepo := db.NewRoundRepo(pool)

	sessionStore := auth.NewSessionStore()
	go sessionStore.Cleanup(10 * time.Minute)

	hub := ws.NewHub()

	queue := matchmaking.NewQueue(hub, pool, playerRepo, matchRepo, roundRepo)

	hub.SetOnMessage(func(msg *ws.Message, client *ws.Client) {
		switch msg.Type {
		case "join_queue":
			queue.Join(&matchmaking.Entry{
				PlayerID: client.PlayerID,
				ClientID: client.ID,
				Username: client.Username,
			})
		case "leave_queue":
			queue.Leave(client.PlayerID)
		default:
			client.SendJSON(map[string]interface{}{
				"type":    "error",
				"message": "unknown message type",
			})
		}
	})

	go hub.Run()

	allowedOrigins := parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS"))

	h := handler.New(playerRepo, matchRepo, roundRepo, sessionStore, hub, allowedOrigins)

	r := chi.NewRouter()
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Timeout(30 * time.Second))
	r.Use(corsMiddleware)

	r.Post("/api/register", h.Register)
	r.Post("/api/login", h.Login)
	r.Get("/api/ws", h.HandleWebSocket)

	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware(sessionStore))
		r.Get("/api/players/{id}", h.GetPlayerProfile)
		r.Get("/api/players/{id}/matches", h.GetPlayerMatches)
		r.Get("/api/leaderboard", h.GetLeaderboard)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("server listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server shutdown error: %v", err)
	}
	log.Println("server stopped")
}

func parseAllowedOrigins(raw string) map[string]bool {
	origins := map[string]bool{
		"http://localhost:5173": true,
	}
	if raw == "" {
		return origins
	}
	for _, o := range strings.Split(raw, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins[o] = true
		}
	}
	return origins
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
