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
