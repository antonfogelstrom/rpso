# RPSO Backend

Rock Paper Scissors Online — real-time multiplayer backend.

## Stack

- **Language:** Go 1.25+
- **Database:** PostgreSQL via Supabase (`pgx/v5`)
- **Real-time:** WebSocket (`gorilla/websocket`)
- **Auth:** Username + bearer token (bcrypt hashed)
- **Router:** `chi/v5`

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL
go run ./cmd/server
```

Run `migrations/001_init.sql` against your Supabase DB before starting.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | `{"username":"..."}` → `{"token":"...", "player_id":"...", "username":"..."}` |
| POST | `/api/login` | `{"username":"...", "token":"..."}` → `{"player_id":"...", "rating":...}` |
| GET | `/api/players/{id}` | Profile with W/L/D stats |
| GET | `/api/players/{id}/matches?limit=50` | Match history |
| GET | `/api/leaderboard?limit=50` | Top players by rating |
| WS | `/api/ws?token=...` | WebSocket (authenticated) |

## WebSocket Protocol

**Client → Server:**
```json
{"type": "join_queue"}
{"type": "leave_queue"}
{"type": "move", "move": "rock|paper|scissors"}
```

**Server → Client:**
```json
{"type": "queue_status", "position": 1}
{"type": "match_found", "match_id":"...", "opponent":"...", "opponent_rating":1000}
{"type": "round_result", "round":1, "your_move":"rock", "opponent_move":"paper", "result":"win|loss|tie", "score":[1,0]}
{"type": "match_result", "winner":"you|opponent", "rating_change":15, "final_score":[2,1]}
{"type": "error", "message":"..."}
```

Matches are best-of-3 with ELO rating (K=32, start=1000). Ties replay the round. 30s move timeout.

## Project Structure

```
cmd/server/main.go       # entrypoint, wiring, graceful shutdown
internal/
  auth/                  # token gen, bcrypt, session store, middleware
  db/                    # pgx pool, repos (players, matches, rounds)
  game/                  # move resolution, ELO, per-match engine
  handler/               # HTTP handlers + WS upgrade
  matchmaking/           # FIFO auto-queue
  model/                 # shared types
  ws/                    # hub, client (read/write pumps), message routing
migrations/001_init.sql  # DDL for players, matches, rounds
```

## Database Schema

`players` — id (UUID PK), username (unique), token_hash, rating (default 1000), created_at  
`matches` — id, player1_id, player2_id, winner_id (nullable), ratings before/after, rating_delta, status (active/completed), best_of (default 3), timestamps  
`rounds` — id, match_id (FK cascade), round_number, player1_move, player2_move, winner_id (nullable for ties)

## Development

```bash
go build ./...   # compile check
go vet ./...     # static analysis
```
