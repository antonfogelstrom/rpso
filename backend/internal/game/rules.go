package game

func ResolveMove(p1Move, p2Move string) int {
	if p1Move == p2Move {
		return 0
	}
	switch p1Move {
	case "rock":
		if p2Move == "scissors" {
			return 1
		}
	case "paper":
		if p2Move == "rock" {
			return 1
		}
	case "scissors":
		if p2Move == "paper" {
			return 1
		}
	}
	return 2
}

func IsValidMove(move string) bool {
	return move == "rock" || move == "paper" || move == "scissors"
}
