# No tests

**Severity:** Medium  
**Files:** Entire project (no `_test.go` files found)

## Problem

The project has zero automated tests. The core business logic — ELO calculation, move resolution, and the game engine — is untested. This makes refactoring risky and allows regressions to go undetected.

## Fix

Add unit tests for the pure-logic packages, starting with the easiest to test:

### 1. `internal/game/rules_test.go`

Test `ResolveMove` and `IsValidMove`:

```go
package game

import "testing"

func TestResolveMove(t *testing.T) {
    tests := []struct {
        p1, p2 string
        want   int
    }{
        {"rock", "rock", 0},
        {"rock", "scissors", 1},
        {"scissors", "rock", 2},
        {"paper", "rock", 1},
        {"rock", "paper", 2},
        {"scissors", "paper", 1},
        {"paper", "scissors", 2},
    }
    for _, tt := range tests {
        got := ResolveMove(tt.p1, tt.p2)
        if got != tt.want {
            t.Errorf("ResolveMove(%q, %q) = %d, want %d", tt.p1, tt.p2, got, tt.want)
        }
    }
}

func TestIsValidMove(t *testing.T) {
    if !IsValidMove("rock") {
        t.Error("IsValidMove('rock') = false, want true")
    }
    if IsValidMove("fire") {
        t.Error("IsValidMove('fire') = true, want false")
    }
}
```

### 2. `internal/game/elo_test.go`

```go
package game

import "testing"

func TestCalculateELO(t *testing.T) {
    // Equal ratings, player 1 wins
    newA, newB := CalculateELO(1000, 1000, 1)
    if newA != 1016 {
        t.Errorf("winner 1000 -> %d, want 1016", newA)
    }
    if newB != 984 {
        t.Errorf("loser 1000 -> %d, want 984", newB)
    }

    // Draw
    newA, newB = CalculateELO(1000, 1000, 0)
    if newA != 1000 || newB != 1000 {
        t.Errorf("draw: got %d, %d, want 1000, 1000", newA, newB)
    }
}
```

### 3. Unit tests for `internal/auth/token.go`

```go
package auth

import "testing"

func TestGenerateAndVerifyToken(t *testing.T) {
    token, err := GenerateToken()
    if err != nil {
        t.Fatal(err)
    }
    if len(token) != 64 {
        t.Fatalf("token length = %d, want 64", len(token))
    }

    hash, err := HashToken(token)
    if err != nil {
        t.Fatal(err)
    }
    if !VerifyToken(token, hash) {
        t.Error("VerifyToken failed for valid token")
    }

    if VerifyToken("wrong-token", hash) {
        t.Error("VerifyToken returned true for invalid token")
    }
}
```

### 4. Integration tests

For the engine, write integration tests using mock repositories or an in-memory database to verify the full match lifecycle (play rounds, timeout, disconnect forfeit, ELO update).

Run tests with:
```bash
go test ./... -v
```
