package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/antonfogelstrom/rpso/internal/auth"
)

var (
	loginIPLimiter       = newRateLimiter(20, time.Minute)
	loginUsernameLimiter = newRateLimiter(5, time.Minute)
)

type loginRequest struct {
	Username string `json:"username"`
	Token    string `json:"token"`
}

type loginResponse struct {
	PlayerID string `json:"player_id"`
	Username string `json:"username"`
	Rating   int    `json:"rating"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ip := realIP(r)
	if !loginIPLimiter.Allow(ip) {
		writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many login attempts")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "Request body too large")
			return
		}
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	if req.Username == "" || req.Token == "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELDS", "Username and token are required")
		return
	}

	if !loginUsernameLimiter.Allow(req.Username) {
		writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many login attempts")
		return
	}

	player, err := h.players.GetByUsername(r.Context(), req.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Database error")
		return
	}
	if player == nil || !auth.VerifyToken(req.Token, player.TokenHash) {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid username or token")
		return
	}

	h.session.Set(req.Token, player.ID)

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    req.Token,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteStrictMode,
	})

	writeJSON(w, http.StatusOK, envelope{
		Data: loginResponse{
			PlayerID: player.ID.String(),
			Username: player.Username,
			Rating:   player.Rating,
		},
	})
}
