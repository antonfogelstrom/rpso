package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/antonfogelstrom/rpso/internal/auth"
	"github.com/antonfogelstrom/rpso/internal/model"
	"github.com/jackc/pgx/v5/pgconn"
)

var registerLimiter = newRateLimiter(5, time.Minute)

type registerResponse struct {
	PlayerID string `json:"player_id"`
	Username string `json:"username"`
	Token    string `json:"token"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	ip := realIP(r)
	if !registerLimiter.Allow(ip) {
		writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many registration attempts")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	var req struct{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "Request body too large")
			return
		}
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	token, err := auth.GenerateToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Failed to generate token")
		return
	}

	tokenHash, err := auth.HashToken(token)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Failed to hash token")
		return
	}

	var player *model.Player
	for attempt := 0; attempt < 5; attempt++ {
		username := generateUsername()
		player, err = h.players.Create(r.Context(), username, tokenHash)
		if err == nil {
			break
		}
		if pgErr, ok := err.(*pgconn.PgError); !(ok && pgErr.Code == "23505") {
			writeError(w, http.StatusInternalServerError, "INTERNAL", "Failed to create player")
			return
		}
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Failed to generate unique username")
		return
	}

	h.session.Set(token, player.ID)

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteStrictMode,
	})

	writeJSON(w, http.StatusCreated, envelope{
		Data: registerResponse{
			PlayerID: player.ID.String(),
			Username: player.Username,
			Token:    token,
		},
	})
}
