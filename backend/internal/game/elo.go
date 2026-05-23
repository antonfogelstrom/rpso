package game

import "math"

func CalculateELO(ratingA, ratingB int, winner int) (int, int) {
	const K = 32.0

	expectedA := 1.0 / (1.0 + math.Pow(10, float64(ratingB-ratingA)/400.0))
	expectedB := 1.0 - expectedA

	var scoreA, scoreB float64
	switch winner {
	case 1:
		scoreA, scoreB = 1.0, 0.0
	case 2:
		scoreA, scoreB = 0.0, 1.0
	default:
		scoreA, scoreB = 0.5, 0.5
	}

	newA := ratingA + int(math.Round(K*(scoreA-expectedA)))
	newB := ratingB + int(math.Round(K*(scoreB-expectedB)))
	return newA, newB
}
