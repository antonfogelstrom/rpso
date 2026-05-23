package handler

import (
	"log"
	"net/http"
	"strings"

	"github.com/antonfogelstrom/rpso/internal/auth"
	"github.com/antonfogelstrom/rpso/internal/ws"
	"github.com/gorilla/websocket"
)

func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	protocols := websocket.Subprotocols(r)
	var token string
	for _, p := range protocols {
		if strings.HasPrefix(p, "bearer-") {
			token = strings.TrimPrefix(p, "bearer-")
			break
		}
	}
	if token == "" {
		writeError(w, http.StatusUnauthorized, "MISSING_TOKEN", "token required via Sec-WebSocket-Protocol header")
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

	responseHeader := http.Header{}
	for _, p := range protocols {
		if strings.HasPrefix(p, "bearer-") {
			responseHeader.Set("Sec-WebSocket-Protocol", p)
			break
		}
	}

	conn, err := upgrader.Upgrade(w, r, responseHeader)
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
