package handler

import (
	"net/http"
	"strconv"
)

func (h *Handler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	players, err := h.players.GetLeaderboard(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "Database error")
		return
	}

	writeJSON(w, http.StatusOK, envelope{
		Data: players,
	})
}
