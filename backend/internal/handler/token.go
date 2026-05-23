package handler

import (
	"net/http"

	"github.com/antonfogelstrom/rpso/internal/auth"
)

type rotateTokenResponse struct {
	Token string `json:"token"`
}

func (h *Handler) RotateToken(w http.ResponseWriter, r *http.Request) {
	playerID, ok := auth.PlayerIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "not authenticated")
		return
	}

	cookie, _ := r.Cookie("session_token")
	oldToken := ""
	if cookie != nil {
		oldToken = cookie.Value
	}

	newToken, err := auth.GenerateToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to generate token")
		return
	}

	tokenHash, err := auth.HashToken(newToken)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to hash token")
		return
	}

	if err := h.players.UpdateToken(r.Context(), playerID, tokenHash); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to update token")
		return
	}

	if oldToken != "" {
		h.session.Delete(oldToken)
	}
	h.session.Set(newToken, playerID)

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    newToken,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, http.StatusOK, envelope{
		Data: rotateTokenResponse{Token: newToken},
	})
}
