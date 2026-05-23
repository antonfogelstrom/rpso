package handler

import (
	"encoding/json"
	"net/http"

	"github.com/antonfogelstrom/rpso/internal/auth"
	"github.com/antonfogelstrom/rpso/internal/db"
	"github.com/antonfogelstrom/rpso/internal/ws"
)

type Handler struct {
	players        *db.PlayerRepo
	matches        *db.MatchRepo
	rounds         *db.RoundRepo
	session        *auth.SessionStore
	hub            *ws.Hub
	allowedOrigins map[string]bool
}

func New(players *db.PlayerRepo, matches *db.MatchRepo, rounds *db.RoundRepo, session *auth.SessionStore, hub *ws.Hub, allowedOrigins map[string]bool) *Handler {
	return &Handler{
		players:        players,
		matches:        matches,
		rounds:         rounds,
		session:        session,
		hub:            hub,
		allowedOrigins: allowedOrigins,
	}
}

type envelope struct {
	Data  interface{} `json:"data,omitempty"`
	Error *apiError   `json:"error,omitempty"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, envelope{
		Error: &apiError{Code: code, Message: message},
	})
}
