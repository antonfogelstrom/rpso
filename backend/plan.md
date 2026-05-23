# Rock Paper Scissors Online — Backend

## Tech Stack
- **Language:** Go
- **Database:** PostgreSQL via Supabase (`pgx` driver)
- **Real-time:** WebSocket (`gorilla/websocket`)
- **Auth:** Simple username + auto-generated bearer token (stored in DB)

## Features

1. **Player Accounts** — register with a username, get a bearer token; login returns the same token.
2. **Real-time WebSocket gameplay** — players connect via WS, send moves, receive round/match results live.
3. **Auto-matchmaking queue** — players enter a queue; when 2 are waiting, a best-of-3 match begins.
4. **Best-of-3 rules** — first to 2 round wins. Ties (both pick same) replay the round.
5. **ELO rating** — each player starts at 1000; ratings update after each match.
6. **Match history** — persistent record of every match and its rounds.
7. **Player profiles** — endpoint returning username, rating, W/L/D, total matches.
8. **Leaderboard** — top players sorted by rating.

## Data Model

```sql
players:
  id            UUID (PK)
  username      TEXT UNIQUE
  token         TEXT (hashed)
  rating        INT default 1000
  created_at    TIMESTAMPTZ

matches:
  id            UUID (PK)
  player1_id    UUID FK -> players
  player2_id    UUID FK -> players
  winner_id     UUID FK -> players (nullable)
  player1_rating_before INT
  player2_rating_before INT
  rating_delta  INT
  status        TEXT (active / completed)
  best_of       INT default 3
  created_at    TIMESTAMPTZ
  completed_at  TIMESTAMPTZ

rounds:
  id            UUID (PK)
  match_id      UUID FK -> matches
  round_number  INT
  player1_move  TEXT (rock/paper/scissors)
  player2_move  TEXT
  winner_id     UUID FK -> players (nullable for ties)
  created_at    TIMESTAMPTZ
```

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Create account (username → token) |
| POST | `/api/login` | Login (username → token) |
| GET | `/api/players/:id` | Player profile |
| GET | `/api/players/:id/matches` | Player match history |
| GET | `/api/leaderboard` | Top players by rating |
| WS | `/api/ws` | WebSocket (authenticated via query param) |

## WebSocket Protocol

All messages are JSON.

### Client → Server

- `{"type": "join_queue"}` — enter matchmaking
- `{"type": "leave_queue"}` — leave matchmaking
- `{"type": "move", "move": "rock"|"paper"|"scissors"}` — submit a round move

### Server → Client

- `{"type": "queue_status", "position": 1}` — waiting in queue
- `{"type": "match_found", "match_id": "...", "opponent": "...", "opponent_rating": 1000}`
- `{"type": "round_result", "round": 1, "your_move": "rock", "opponent_move": "paper", "result": "loss", "score": [0,1]}`
- `{"type": "match_result", "winner": "you"|"opponent"|null, "rating_change": +15, "final_score": [2,1]}`
- `{"type": "error", "message": "..."}`

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── auth/        # token generation & validation
│   ├── db/          # repository layer (Supabase/pgx)
│   ├── game/        # game logic (resolve moves, best-of-3)
│   ├── handler/     # HTTP & WS handlers
│   ├── matchmaking/ # queue + match creation
│   ├── model/       # shared types/structs
│   └── ws/          # WebSocket client management
├── migrations/      # SQL migration files
├── go.mod
└── go.sum
```
