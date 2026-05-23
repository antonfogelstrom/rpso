package handler

import (
	"encoding/json"
	"net/http"

	"github.com/antonfogelstrom/rpso/internal/auth"
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
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	if req.Username == "" || req.Token == "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELDS", "Username and token are required")
		return
	}

	player, err := h.players.GetByUsername(r.Context(), req.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Database error")
		return
	}
	if player == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Player not found")
		return
	}

	if !auth.VerifyToken(req.Token, player.TokenHash) {
		writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Token does not match")
		return
	}

	h.session.Set(req.Token, player.ID)

	writeJSON(w, http.StatusOK, envelope{
		Data: loginResponse{
			PlayerID: player.ID.String(),
			Username: player.Username,
			Rating:   player.Rating,
		},
	})
}
