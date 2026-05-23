package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/antonfogelstrom/rpso/internal/auth"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	usernameRegex   = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	registerLimiter = newRateLimiter(5, time.Minute)
)

type registerRequest struct {
	Username string `json:"username"`
}

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
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "Request body too large")
			return
		}
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if len(req.Username) < 3 || len(req.Username) > 20 {
		writeError(w, http.StatusBadRequest, "INVALID_USERNAME", "Username must be 3-20 characters")
		return
	}
	if !usernameRegex.MatchString(req.Username) {
		writeError(w, http.StatusBadRequest, "INVALID_USERNAME", "Username may only contain letters, numbers, and underscores")
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

	player, err := h.players.Create(r.Context(), req.Username, tokenHash)
	if err != nil {
		// Check for unique violation
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "USERNAME_TAKEN", "Username already taken")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Failed to create player")
		return
	}

	h.session.Set(token, player.ID)

	writeJSON(w, http.StatusCreated, envelope{
		Data: registerResponse{
			PlayerID: player.ID.String(),
			Username: player.Username,
			Token:    token,
		},
	})
}
