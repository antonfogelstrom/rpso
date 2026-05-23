package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

const PlayerIDKey contextKey = "player_id"

type contextKey string

func Middleware(sessions *SessionStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"missing or malformed token"}`, http.StatusUnauthorized)
				return
			}
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == "" {
				http.Error(w, `{"error":"empty token"}`, http.StatusUnauthorized)
				return
			}
			playerID, ok := sessions.Get(token)
			if !ok {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), PlayerIDKey, playerID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func PlayerIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(PlayerIDKey).(uuid.UUID)
	return id, ok
}
