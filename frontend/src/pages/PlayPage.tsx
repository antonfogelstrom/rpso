import { useState, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { useWebSocket } from "../hooks/useWebSocket"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import type { ServerMessage, Move, GameStatus, MatchFoundMessage, RoundResultMessage, MatchResultMessage } from "../types"

export function PlayPage({ onGameActiveChange }: { onGameActiveChange?: (active: boolean) => void }) {
  const { token } = useAuth()
  const [status, setStatus] = useState<GameStatus>("idle")
  const statusRef = useRef(status)
  statusRef.current = status
  const [position, setPosition] = useState(0)
  const [match, setMatch] = useState<MatchFoundMessage | null>(null)
  const [rounds, setRounds] = useState<RoundResultMessage[]>([])
  const [resultMsg, setResultMsg] = useState<MatchResultMessage | null>(null)
  const [error, setError] = useState("")

  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "queue_status":
        setPosition(msg.position)
        break
      case "match_found":
        setMatch(msg)
        setRounds([])
        setResultMsg(null)
        setStatus("playing")
        setPosition(0)
        onGameActiveChange?.(true)
        break
      case "round_result":
        setRounds((prev) => [...prev, msg])
        break
      case "match_result":
        setResultMsg(msg)
        setStatus("done")
        break
      case "error":
        setError(msg.message)
        break
    }
  }, [onGameActiveChange])

  const onOpen = useCallback(() => setStatus("connected"), [])
  const onClose = useCallback(() => {
    const prev = statusRef.current
    if (prev !== "idle" && prev !== "done") {
      setError("Disconnected")
    }
    setStatus("idle")
    onGameActiveChange?.(false)
  }, [onGameActiveChange])

  const { send } = useWebSocket(token, onMessage, onOpen, onClose)

  const join = () => {
    setError("")
    send({ type: "join_queue" })
    setStatus("queueing")
  }

  const leave = () => {
    send({ type: "leave_queue" })
    setStatus("connected")
    setPosition(0)
    onGameActiveChange?.(false)
  }

  const makeMove = (move: Move) => {
    send({ type: "move", data: { move } })
  }

  const handlePlayAgain = () => {
    setMatch(null)
    setRounds([])
    setResultMsg(null)
    join()
  }

  const handleHome = () => {
    send({ type: "leave_queue" })
    setStatus("connected")
    setMatch(null)
    setRounds([])
    setResultMsg(null)
    setError("")
    onGameActiveChange?.(false)
  }

  const moves: { label: string; move: Move; emoji: string }[] = [
    { label: "Rock", move: "rock", emoji: "\u{1F5FF}" },
    { label: "Paper", move: "paper", emoji: "\u{1F4C4}" },
    { label: "Scissors", move: "scissors", emoji: "\u2702\uFE0F" },
  ]

  return (
    <div className="space-y-4">
      <Card className="text-center space-y-3">
        {status === "idle" && (
          <p className="text-neutral-500">Connecting...</p>
        )}

        {status === "connected" && (
          <>
            <p className="text-emerald-400 font-semibold">Connected</p>
            <Button onClick={join}>Join Queue</Button>
          </>
        )}

        {status === "queueing" && (
          <>
            <p className="text-yellow-400">
              In queue{position > 0 && ` (#${position})`}...
            </p>
            <Button variant="danger" onClick={leave}>Leave</Button>
          </>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </Card>

      {(status === "playing" || status === "done") && match && (
        <div className="space-y-4">
          <Card className="text-center">
            <p className="text-sm text-neutral-400">
              vs <span className="font-semibold text-emerald-400">{match.opponent}</span>
              {" "}<span className="text-neutral-500">({match.opponent_rating})</span>
            </p>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            {moves.map(({ label, move, emoji }) => (
              <button
                key={move}
                onClick={() => makeMove(move)}
                disabled={status === "done"}
                className="flex flex-col items-center justify-center min-h-[88px] bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-xl border border-neutral-700 transition-colors"
              >
                <span className="text-3xl mb-1">{emoji}</span>
                <span className="text-xs font-medium text-neutral-300">{label}</span>
              </button>
            ))}
          </div>

          {rounds.length > 0 && (
            <div className="space-y-1">
              {rounds.map((r) => (
                <Card key={r.round} className="flex justify-between items-center py-2">
                  <span className="text-sm text-neutral-300">
                    R{r.round}: {r.your_move} vs {r.opponent_move}
                  </span>
                  <span className="text-sm">
                    <Badge variant={r.result === "win" ? "win" : r.result === "loss" ? "loss" : "draw"}>
                      {r.result === "win" ? "W" : r.result === "loss" ? "L" : "T"}
                    </Badge>
                    <span className="text-neutral-500 ml-1">{r.score[0]}-{r.score[1]}</span>
                  </span>
                </Card>
              ))}
            </div>
          )}

          {resultMsg && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <Card className="text-center space-y-3 max-w-sm w-full">
                <p className={`text-2xl font-bold ${
                  resultMsg.winner === "you" ? "text-emerald-400" :
                  resultMsg.winner === "opponent" ? "text-red-400" : "text-neutral-400"
                }`}>
                  {resultMsg.winner === "you" ? "You Win!" :
                   resultMsg.winner === "opponent" ? "You Lose" : "Draw"}
                </p>
                <p className="text-sm text-neutral-400">
                  <Badge variant={resultMsg.rating_change > 0 ? "win" : resultMsg.rating_change < 0 ? "loss" : "draw"}>
                    {resultMsg.rating_change > 0 ? "+" : ""}{resultMsg.rating_change}
                  </Badge>
                  {" \u00b7 "}
                  {resultMsg.final_score[0]}-{resultMsg.final_score[1]}
                </p>
                <Button onClick={handlePlayAgain} className="w-full">Play Again</Button>
                <Button variant="ghost" onClick={handleHome} className="w-full">Back to Menu</Button>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
