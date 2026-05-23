package handler

import (
	"log"
	"net/http"

	"github.com/antonfogelstrom/rpso/internal/auth"
	"github.com/antonfogelstrom/rpso/internal/ws"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for MVP
	},
}

func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		writeError(w, http.StatusUnauthorized, "MISSING_TOKEN", "token query parameter required")
		return
	}

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
