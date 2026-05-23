package handler

import (
	"log"
	"net/http"

	"github.com/antonfogelstrom/rpso/internal/auth"
	"github.com/antonfogelstrom/rpso/internal/ws"
	"github.com/gorilla/websocket"
)

func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "MISSING_TOKEN", "token required via cookie")
		return
	}
	token := cookie.Value

	playerID, ok := h.session.Get(token)
	if !ok {
		writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "invalid or expired token")
		return
	}

	// Verify token against DB hash
	player, err := h.players.GetByID(r.Context(), playerID)
	if err != nil || player == nil {
		writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "player not found")
		return
	}
	if !auth.VerifyToken(token, player.TokenHash) {
		writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "token does not match")
		return
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			return h.allowedOrigins[origin]
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade failed: %v", err)
		return
	}

	client := ws.NewClient(conn, playerID, h.hub)
	client.Username = player.Username

	h.hub.RegisterClient(client)
	go client.WritePump()
	go client.ReadPump()
}
