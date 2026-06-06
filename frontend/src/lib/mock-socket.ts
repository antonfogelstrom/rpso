import type { ServerMessage, ClientMessage } from "../types"

const BOT_MOVES = ["rock", "paper", "scissors"] as const

function determineResult(
  myMove: string,
  botMove: string,
): "win" | "loss" | "tie" {
  if (myMove === botMove) return "tie"
  if (
    (myMove === "rock" && botMove === "scissors") ||
    (myMove === "scissors" && botMove === "paper") ||
    (myMove === "paper" && botMove === "rock")
  ) {
    return "win"
  }
  return "loss"
}

export class MockGameSocket {
  private onMessageCallback: ((msg: ServerMessage) => void) | null = null
  private onOpenCallback: (() => void) | null = null
  private onCloseCallback: (() => void) | null = null
  private timers: ReturnType<typeof setTimeout>[] = []
  private active = false
  private round = 0
  private myScore = 0
  private botScore = 0
  private matchActive = false

  connect() {
    this.active = true
    queueMicrotask(() => {
      this.onOpenCallback?.()
    })
  }

  send(msg: ClientMessage) {
    if (!this.active) return

    if (msg.type === "join_queue") {
      this.round = 0
      this.myScore = 0
      this.botScore = 0
      this.matchActive = false

      const timer = setTimeout(() => {
        if (!this.active) return
        this.matchActive = true
        this.onMessageCallback?.({
          type: "match_found",
          match_id: crypto.randomUUID(),
          opponent: "Bot",
          opponent_rating: 1000,
          move_timeout: 30,
        })
      }, 800)
      this.timers.push(timer)
    } else if (msg.type === "move") {
      if (!this.matchActive) return

      const myMove = msg.data.move
      this.round++
      const botMove = BOT_MOVES[(this.round - 1) % 3]
      const result = determineResult(myMove, botMove)

      if (result === "win") this.myScore++
      else if (result === "loss") this.botScore++

      const roundResult: ServerMessage = {
        type: "round_result",
        round: this.round,
        your_move: myMove,
        opponent_move: botMove,
        result,
        score: [this.myScore, this.botScore] as [number, number],
      }

      const timer = setTimeout(() => {
        if (!this.active) return
        this.onMessageCallback?.(roundResult)

        if (this.myScore >= 2 || this.botScore >= 2) {
          const timer2 = setTimeout(() => {
            if (!this.active) return

            let winner: "you" | "opponent" | "draw"
            if (this.myScore > this.botScore) winner = "you"
            else if (this.botScore > this.myScore) winner = "opponent"
            else winner = "draw"

            const ratingChange =
              winner === "you" ? 16 : winner === "opponent" ? -16 : 0

            this.onMessageCallback?.({
              type: "match_result",
              winner,
              rating_change: ratingChange,
              final_score: [this.myScore, this.botScore] as [number, number],
            })

            this.matchActive = false
          }, 500)
          this.timers.push(timer2)
        }
      }, 1000)
      this.timers.push(timer)
    } else if (msg.type === "leave_queue") {
      this.active = false
      this.matchActive = false
      for (const t of this.timers) {
        clearTimeout(t)
      }
      this.timers = []
    }
  }

  disconnect() {
    this.active = false
    this.matchActive = false
    for (const t of this.timers) {
      clearTimeout(t)
    }
    this.timers = []
    this.onCloseCallback?.()
  }

  onMessage(cb: (msg: ServerMessage) => void) {
    this.onMessageCallback = cb
  }

  onOpen(cb: () => void) {
    this.onOpenCallback = cb
  }

  onClose(cb: () => void) {
    this.onCloseCallback = cb
  }
}
