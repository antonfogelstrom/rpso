package ws

import "encoding/json"

type Message struct {
	Type     string          `json:"type"`
	ClientID string          `json:"-"`
	Data     json.RawMessage `json:"data,omitempty"`
}
