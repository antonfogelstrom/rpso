# Phase 0: Project Scaffolding

## Goals
- Initialize Go module
- Install dependencies
- Create directory structure

## Actions

### 1. Init module
```bash
go mod init github.com/<user>/rpso-backend
```

### 2. Install dependencies
```bash
go get github.com/jackc/pgx/v5
go get github.com/gorilla/websocket
go get golang.org/x/crypto
go get github.com/google/uuid
go get github.com/go-chi/chi/v5
go get github.com/joho/godotenv  # local dev only
```

### 3. Create directory structure
```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── auth/
│   ├── db/
│   ├── game/
│   ├── handler/
│   ├── matchmaking/
│   ├── model/
│   └── ws/
├── migrations/
├── go.mod
└── go.sum
```

### 4. Create `.env.example`
```
DATABASE_URL=postgres://user:pass@host:5432/postgres
PORT=8080
```

## Design Decisions
- **`chi` router** over `gorilla/mux` or `gin` — stdlib-compatible, lightweight, native middleware chaining.
- **`pgx` directly** (not `database/sql`) — native PostgreSQL features, connection pooling via `pgxpool`.
- **`golang.org/x/crypto/bcrypt`** for token hashing.
- **Environment variables** for all config; `.env` file loaded by `godotenv` in dev only.
