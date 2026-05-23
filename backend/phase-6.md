# Phase 6: Game Engine

## Goals
- Round move resolution (rock/paper/scissors)
- Best-of-3 match flow
- ELO rating calculation
- Timeout handling (forfeit on inactivity)

## Files

### `internal/game/rules.go`
```go
package game

// ResolveMove returns the winner ID given two moves.
// Returns nil for a tie.
func ResolveMove(p1Move, p2Move string) int {
    // 0 = tie, 1 = p1 wins, 2 = p2 wins
    if p1Move == p2Move {
        return 0
    }
    switch p1Move {
    case "rock":
        if p2Move == "scissors" { return 1 }
    case "paper":
        if p2Move == "rock" { return 1 }
    case "scissors":
        if p2Move == "paper" { return 1 }
    }
    return 2
}
```

### `internal/game/elo.go`
```go
// CalculateELO computes new ratings.
// winner: 1 = player A wins, 2 = player B wins, 0 = tie
func CalculateELO(ratingA, ratingB int, winner int) (newA, newB int) {
    const K = 32
    expectedA := 1.0 / (1.0 + math.Pow(10, float64(ratingB-ratingA)/400.0))
    expectedB := 1.0 - expectedA

    var scoreA, scoreB float64
    switch winner {
    case 1:
        scoreA, scoreB = 1.0, 0.0
    case 2:
        scoreA, scoreB = 0.0, 1.0
    case 0:
        scoreA, scoreB = 0.5, 0.5
    }

    newA = ratingA + int(math.Round(K*(scoreA-expectedA)))
    newB = ratingB + int(math.Round(K*(scoreB-expectedB)))
    return
}
```

### `internal/game/engine.go`
```go
type Engine struct {
    MatchID      uuid.UUID
    Player1ID    uuid.UUID
    Player2ID    uuid.UUID
    Player1Name  string
    Player2Name  string
    Score         [2]int  // [p1_wins, p2_wins]
    CurrentRound int
    BestOf       int
    State        string  // "waiting" | "round_active" | "round_complete" | "match_complete"
    hub          *ws.Hub
    pool         *pgxpool.Pool
    mu           sync.Mutex

    moveCh     chan MoveMsg   // incoming moves from hub
    done       chan struct{}
    forfeitTimer *time.Timer
    needsForfeit  bool
}

type MoveMsg struct {
    PlayerID uuid.UUID
    Move     string
}
```

### Match Flow

1. **Start**: Engine creates `moveCh` (buffered, size 2), registers with hub as the receiver for this match's moves.
2. **Round loop** (runs in a goroutine):
   a. Set `State = "round_active"`
   b. Start forfeit timer (30s)
   c. Wait for first move via `moveCh` → store it, reset timer for second player
   d. Wait for second move via `moveCh` → cancel timer
   e. If timer fires before both moves: call `forfeitRound(playerWhoDidntMove)`
   f. Resolve moves via `ResolveMove`
   g. Persist round via `db.CreateRound`
   h. Send `round_result` to both players
   i. Update scores. If tie → replay round (don't increment round number).
   j. If `Score[0] >= 2 || Score[1] >= 2` → match is over. Else → increment `CurrentRound`, loop.
3. **Match end**:
   a. Determine winner
   b. Calculate ELO via `CalculateELO`
   c. DB transaction: `CompleteMatch` + update both players' ratings
   d. Send `match_result` to both clients
   e. Clean up: unregister from hub, close channels

### WebSocket Messages Sent by Engine

**`round_result`** (per round):
```json
{
  "type": "round_result",
  "round": 1,
  "your_move": "rock",
  "opponent_move": "paper",
  "result": "win"|"loss"|"tie",
  "score": [1, 0]
}
```

**`match_result`** (match end):
```json
{
  "type": "match_result",
  "winner": "you"|"opponent"|null,
  "rating_change": +15,
  "final_score": [2, 1]
}
```

## Edge Cases
- **Both moves arrive at the same time**: Channel handles buffered writes sequentially.
- **Player sends invalid move**: Send error, don't consume the move (they must resend).
- **Player sends move twice**: Second is ignored (idempotent).
- **Player disconnects during round**: Hub sends disconnect signal; engine treats as forfeit after timeout.
- **Match DB write fails**: Engine logs error, notifies both players of server error.
- **Tie rounds**: Don't count toward `CurrentRound` increment; replay same round number.
- **Rating delta**: Can be negative if higher-rated player loses to lower-rated player.
