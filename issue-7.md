# Issue 7: Player Profiles Public — No Authorization Check

**Severity:** Medium  
**File:** `internal/handler/player.go`

## Description

`GetPlayerProfile` and `GetPlayerMatches` accept any player UUID and return full profile data (username, rating, W/L/D stats, match history) with no authentication or authorization check. Combined with Issue 1 (auth middleware not wired), these endpoints are fully public.

## Impact

- Any unauthenticated user can enumerate player UUIDs and view profiles and match history.
- While no PII is exposed beyond usernames and game stats, this may violate user expectations for an online game.
- UUIDs can be leaked through other channels (e.g., match results, WebSocket messages), enabling enumeration.

## Root Cause

The endpoints were never gated behind the auth middleware (Issue 1). Even with the middleware applied, these endpoints currently only verify that a valid token is present — they don't check whether the requesting user is authorized to view the profile.

## Recommendation

After fixing Issue 1 (wiring the auth middleware), decide on the authorization model:

**Option A — Allow viewing any profile (authenticated users only):**

Simply applying the auth middleware is sufficient. All authenticated users can view any profile.

```go
r.Group(func(r chi.Router) {
    r.Use(auth.Middleware(sessionStore))
    r.Get("/api/players/{id}", h.GetPlayerProfile)
    r.Get("/api/players/{id}/matches", h.GetPlayerMatches)
    r.Get("/api/leaderboard", h.GetLeaderboard)
})
```

**Option B — Self-only access (most restrictive):**

Compare the requested player ID against the authenticated player ID:

```go
func (h *Handler) GetPlayerProfile(w http.ResponseWriter, r *http.Request) {
    authedPlayerID, ok := auth.PlayerIDFromContext(r.Context())
    if !ok {
        writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "not authenticated")
        return
    }

    idStr := chi.URLParam(r, "id")
    id, err := uuid.Parse(idStr)
    if err != nil {
        writeError(w, http.StatusBadRequest, "INVALID_ID", "Invalid player ID")
        return
    }

    if id != authedPlayerID {
        writeError(w, http.StatusForbidden, "FORBIDDEN", "cannot view other player's profile")
        return
    }
    // ...
}
```

**Option C — Public profiles with opt-out (if leaderboard is a feature):**

Keep the current behavior but add a `public_profile` boolean column to the `players` table with a default of `true`.
