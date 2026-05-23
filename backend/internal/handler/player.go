package handler

import (
	"net/http"
	"strconv"

	"github.com/antonfogelstrom/rpso/internal/model"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type playerProfileResponse struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	Rating       int    `json:"rating"`
	TotalMatches int    `json:"total_matches"`
	Wins         int    `json:"wins"`
	Losses       int    `json:"losses"`
	Draws        int    `json:"draws"`
	CreatedAt    string `json:"created_at"`
}

func (h *Handler) GetPlayerProfile(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "Invalid player ID")
		return
	}

	player, err := h.players.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Database error")
		return
	}
	if player == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Player not found")
		return
	}

	// Compute stats from match history
	matches, err := h.matches.GetByPlayerID(r.Context(), id, 1000)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Database error")
		return
	}

	var wins, losses, draws int
	for _, m := range matches {
		if m.WinnerID == nil {
			draws++ // shouldn't happen in best-of-3, but handle gracefully
			continue
		}
		if *m.WinnerID == id {
			wins++
		} else {
			losses++
		}
	}

	writeJSON(w, http.StatusOK, envelope{
		Data: playerProfileResponse{
			ID:           player.ID.String(),
			Username:     player.Username,
			Rating:       player.Rating,
			TotalMatches: len(matches),
			Wins:         wins,
			Losses:       losses,
			Draws:        draws,
			CreatedAt:    player.CreatedAt.Format("2006-01-02T15:04:05Z"),
		},
	})
}

func (h *Handler) GetPlayerMatches(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "Invalid player ID")
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	matches, err := h.matches.GetByPlayerID(r.Context(), id, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Database error")
		return
	}

	if matches == nil {
		matches = make([]*model.Match, 0)
	}

	writeJSON(w, http.StatusOK, envelope{
		Data: matches,
	})
}
