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
