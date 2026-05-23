package ws

import (
	"log"
	"sync"

	"github.com/google/uuid"
)

type EngineHandle struct {
	MoveCh       chan *Message
	DisconnectCh chan uuid.UUID
}

type Hub struct {
	clients       map[string]*Client
	register      chan *Client
	unregister    chan *Client
	incoming      chan *Message
	playerMatches map[uuid.UUID]uuid.UUID
	engines       map[uuid.UUID]*EngineHandle
	mu            sync.RWMutex
	onMessage     func(msg *Message, client *Client)
}

func NewHub() *Hub {
	return &Hub{
		clients:       make(map[string]*Client),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		incoming:      make(chan *Message, 256),
		playerMatches: make(map[uuid.UUID]uuid.UUID),
		engines:       make(map[uuid.UUID]*EngineHandle),
	}
}

func (h *Hub) SetOnMessage(fn func(msg *Message, client *Client)) {
	h.mu.Lock()
	h.onMessage = fn
	h.mu.Unlock()
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()
			log.Printf("client %s connected (player %s)", client.ID, client.PlayerID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				delete(h.clients, client.ID)
				close(client.send)

				if matchID, ok := h.playerMatches[client.PlayerID]; ok {
					if eng, ok := h.engines[matchID]; ok {
						go func(pid uuid.UUID) {
							eng.DisconnectCh <- pid
						}(client.PlayerID)
					}
				}
			}
			h.mu.Unlock()

		case msg := <-h.incoming:
			h.handleMessage(msg)
		}
	}
}

func (h *Hub) handleMessage(msg *Message) {
	client, ok := h.getClient(msg.ClientID)
	if !ok {
		return
	}

	if msg.Type == "move" {
		h.mu.RLock()
		matchID, inMatch := h.playerMatches[client.PlayerID]
		eng, engOk := h.engines[matchID]
		h.mu.RUnlock()
		if !inMatch || !engOk {
			client.SendJSON(map[string]interface{}{
				"type":    "error",
				"message": "not in an active match",
			})
			return
		}
		eng.MoveCh <- msg
		return
	}

	h.mu.RLock()
	fn := h.onMessage
	h.mu.RUnlock()
	if fn != nil {
		fn(msg, client)
	}
}

func (h *Hub) RegisterEngine(matchID uuid.UUID, p1ID, p2ID uuid.UUID, handle *EngineHandle) {
	h.mu.Lock()
	h.engines[matchID] = handle
	h.playerMatches[p1ID] = matchID
	h.playerMatches[p2ID] = matchID
	h.mu.Unlock()
}

func (h *Hub) UnregisterEngine(matchID uuid.UUID, p1ID, p2ID uuid.UUID) {
	h.mu.Lock()
	delete(h.engines, matchID)
	delete(h.playerMatches, p1ID)
	delete(h.playerMatches, p2ID)
	h.mu.Unlock()
}

func (h *Hub) getClient(clientID string) (*Client, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	c, ok := h.clients[clientID]
	return c, ok
}

func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

func (h *Hub) GetClient(clientID string) (*Client, bool) {
	return h.getClient(clientID)
}

func (h *Hub) SendToClient(clientID string, msg interface{}) {
	h.mu.RLock()
	client, ok := h.clients[clientID]
	h.mu.RUnlock()
	if ok {
		client.SendJSON(msg)
	}
}

func (h *Hub) SendToPlayer(playerID uuid.UUID, msg interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, client := range h.clients {
		if client.PlayerID == playerID {
			client.SendJSON(msg)
			return
		}
	}
}
