export interface Player {
  id: string
  username: string
  rating: number
  created_at: string
}

export interface PlayerProfile extends Player {
  total_matches: number
  wins: number
  losses: number
  draws: number
}

export interface Match {
  id: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_rating_before: number
  player2_rating_before: number
  player1_rating_delta: number
  player2_rating_delta: number
  status: string
  created_at: string
  completed_at: string | null
}

export interface Round {
  id: string
  match_id: string
  round_number: number
  player1_move: string
  player2_move: string
  winner: number
}

export interface Envelope<T> {
  data?: T
  error?: { code: string; message: string }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RegisterRequest {}

export interface RegisterResponse {
  player_id: string
  username: string
  token: string
}

export interface LoginRequest {
  username: string
  token: string
}

export interface LoginResponse {
  player_id: string
  username: string
  rating: number
}

export interface QueueStatusMessage {
  type: "queue_status"
  position: number
}

export interface MatchFoundMessage {
  type: "match_found"
  match_id: string
  opponent: string
  opponent_rating: number
}

export interface RoundResultMessage {
  type: "round_result"
  round: number
  your_move: string
  opponent_move: string
  result: "win" | "loss" | "tie"
  score: [number, number]
}

export interface MatchResultMessage {
  type: "match_result"
  winner: "you" | "opponent" | "draw"
  rating_change: number
  final_score: [number, number]
}

export interface ErrorMessage {
  type: "error"
  message: string
}

export type ServerMessage =
  | QueueStatusMessage
  | MatchFoundMessage
  | RoundResultMessage
  | MatchResultMessage
  | ErrorMessage

export interface ClientMessageJoinQueue {
  type: "join_queue"
}

export interface ClientMessageLeaveQueue {
  type: "leave_queue"
}

export interface ClientMessageMove {
  type: "move"
  data: { move: "rock" | "paper" | "scissors" }
}

export type ClientMessage = ClientMessageJoinQueue | ClientMessageLeaveQueue | ClientMessageMove

export type Move = "rock" | "paper" | "scissors"
export type View = "login" | "register" | "dash" | "lb" | "play"
export type GameStatus = "idle" | "connected" | "queueing" | "playing" | "done"
