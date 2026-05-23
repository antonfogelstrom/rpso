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
