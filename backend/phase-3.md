# Phase 3: HTTP Handlers

## Goals
- Registration and login endpoints
- Player profile and match history endpoints
- Leaderboard endpoint

## Route Table

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/register` | No | `handler.Register` |
| POST | `/api/login` | No | `handler.Login` |
| GET | `/api/players/{id}` | No | `handler.GetPlayerProfile` |
| GET | `/api/players/{id}/matches` | No | `handler.GetPlayerMatches` |
| GET | `/api/leaderboard` | No | `handler.GetLeaderboard` |

## Files

### `internal/handler/register.go`
- Request: `{"username": "alice"}`
- Validation:
  - Username 3–20 characters
  - Alphanumeric + underscores only (`^[a-zA-Z0-9_]+$`)
  - Trim whitespace
- Flow:
  1. Validate input → 400 if invalid
  2. Check uniqueness via `db.CreatePlayer` → 409 if exists
  3. Generate token via `auth.GenerateToken`
  4. Hash token via `auth.HashToken`
  5. Insert player row
  6. Return `{"player_id": "...", "username": "alice", "token": "..."}`
- Edge cases: duplicate username race → handle `ON CONFLICT` error from pgx

### `internal/handler/login.go`
- Request: `{"username": "alice", "token": "..."}`
- Flow:
  1. Lookup player by username → 404 if not found
  2. Verify token hash → 401 if invalid
  3. Return `{"player_id": "...", "username": "alice", "rating": 1000}`

### `internal/handler/player.go`
- `GetPlayerProfile`:
  1. Parse `{id}` from URL path
  2. Fetch player from DB → 404 if not found
  3. Compute stats (wins, losses, draws, total matches) via a helper DB query
  4. Return player + stats
- `GetPlayerMatches`:
  1. Parse `{id}` from URL path
  2. Fetch matches from DB (ordered by date desc)
  3. Optionally embed rounds per match
  4. Return match list

### `internal/handler/leaderboard.go`
- `GetLeaderboard`:
  1. Parse optional `?limit=` query param (default 50, max 200)
  2. Fetch top players from DB ordered by rating desc
  3. Return player list

## Response Format
Consistent JSON envelope:
```json
{
    "data": { ... },
    "error": null
}
```
On error:
```json
{
    "data": null,
    "error": { "code": "NOT_FOUND", "message": "Player not found" }
}
```
