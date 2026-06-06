import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import type {
  ServerMessage,
  Move,
  GameStatus,
  MatchFoundMessage,
  RoundResultMessage,
  MatchResultMessage,
} from "../types";
import {
  Scissors,
  Scroll,
  Stone,
  SwordsIcon,
  X,
  PlugZap,
  type LucideIcon,
  Hourglass,
} from "lucide-react";

export function PlayPage({
  onGameActiveChange,
}: {
  onGameActiveChange?: (active: boolean) => void;
}) {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [mockMode, setMockMode] = useState(false);
  const mockAutoJoined = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;
  const [match, setMatch] = useState<MatchFoundMessage | null>(null);
  const [rounds, setRounds] = useState<RoundResultMessage[]>([]);
  const [resultMsg, setResultMsg] = useState<MatchResultMessage | null>(null);
  const [myMove, setMyMove] = useState<Move | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pendingResult, setPendingResult] = useState<RoundResultMessage | null>(
    null,
  );
  const [revealed, setRevealed] = useState(false);
  const [choiceTimeLeft, setChoiceTimeLeft] = useState<number | null>(null);
  const [moveTimeout, setMoveTimeout] = useState<number | null>(null);
  const [error, setError] = useState("");

  const onMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "queue_status":
          break;
        case "match_found":
          setMatch(msg);
          setRounds([]);
          setResultMsg(null);
          setMyMove(null);
          setCountdown(null);
          setPendingResult(null);
          setRevealed(false);
          setMoveTimeout(msg.move_timeout);
          setChoiceTimeLeft(msg.move_timeout);
          setStatus("playing");
          onGameActiveChange?.(true);
          break;
        case "round_result":
          setPendingResult(msg);
          setCountdown(1);
          break;
        case "match_result":
          setResultMsg(msg);
          break;
        case "error":
          setError(msg.message);
          break;
      }
    },
    [onGameActiveChange],
  );

  const onOpen = useCallback(() => setStatus("connected"), []);
  const onClose = useCallback(() => {
    const prev = statusRef.current;
    if (prev !== "idle" && prev !== "done") {
      setError("");
    }
    setStatus("idle");
    onGameActiveChange?.(false);
  }, [onGameActiveChange]);

  const { send } = useWebSocket(onMessage, onOpen, onClose, mockMode);

  useEffect(() => {
    if (mockMode && status === "connected" && !mockAutoJoined.current) {
      mockAutoJoined.current = true;
      setError("");
      send({ type: "join_queue" });
      setStatus("queueing");
    }
    if (!mockMode) {
      mockAutoJoined.current = false;
    }
  }, [mockMode, status, send]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        setRevealed(true);
        if (pendingResult) {
          setRounds((prev) => [...prev, pendingResult]);
        }
        setTimeout(() => {
          setMyMove(null);
          setCountdown(null);
          setRevealed(false);
          setPendingResult(null);
          setChoiceTimeLeft(moveTimeout);
          setResultMsg((prev) => {
            if (prev) setStatus("done");
            return prev;
          });
        }, 3000);
      } else {
        setCountdown((c) => (c ?? 0) - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, pendingResult, moveTimeout]);

  useEffect(() => {
    if (choiceTimeLeft === null || choiceTimeLeft <= 0) return;
    const t = setTimeout(() => {
      setChoiceTimeLeft((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(t);
  }, [choiceTimeLeft]);

  const join = () => {
    setError("");
    send({ type: "join_queue" });
    setStatus("queueing");
  };

  const leave = () => {
    send({ type: "leave_queue" });
    setStatus("connected");
    onGameActiveChange?.(false);
  };

  const makeMove = (move: Move) => {
    if (myMove) return;
    setMyMove(move);
    setChoiceTimeLeft(null);
    send({ type: "move", data: { move } });
  };

  const handlePlayAgain = () => {
    setMatch(null);
    setRounds([]);
    setResultMsg(null);
    setMyMove(null);
    setCountdown(null);
    setPendingResult(null);
    setRevealed(false);
    setMoveTimeout(null);
    setChoiceTimeLeft(null);
    join();
  };

  const handleHome = () => {
    send({ type: "leave_queue" });
    setStatus("connected");
    setMatch(null);
    setRounds([]);
    setResultMsg(null);
    setMyMove(null);
    setCountdown(null);
    setPendingResult(null);
    setRevealed(false);
    setMoveTimeout(null);
    setChoiceTimeLeft(null);
    setError("");
    setMockMode(false);
    mockAutoJoined.current = false;
    onGameActiveChange?.(false);
  };

  const moves: { label: string; move: Move; emoji: LucideIcon }[] = [
    { label: "Rock", move: "rock", emoji: Stone },
    { label: "Paper", move: "paper", emoji: Scroll },
    { label: "Scissors", move: "scissors", emoji: Scissors },
  ];

  const MyMoveIcon = moves.find((m) => m.move === myMove)?.emoji;
  const OpponentMoveIcon = moves.find(
    (m) => m.move === pendingResult?.opponent_move,
  )?.emoji;

  return (
    <div className="space-y-4">
      {(status === "idle" ||
        status === "connected" ||
        status === "queueing") && (
        <div className="flex items-center justify-center h-[75vh]">
          {status === "idle" && (
            <Button variant="secondary" icon={PlugZap}>
              Connecting to game server
              <span className="animate-dot">.</span>
              <span className="animate-dot-2">.</span>
              <span className="animate-dot-3">.</span>
            </Button>
          )}

          {status === "connected" && (
            <div className="flex gap-4">
              <Button onClick={join} icon={SwordsIcon}>
                Find match
              </Button>
              {import.meta.env.DEV && (
                <Button onClick={() => setMockMode(true)} icon={SwordsIcon}>
                  Test play
                </Button>
              )}
            </div>
          )}

          {status === "queueing" && (
            <Button variant="secondary" onClick={leave} icon={X}>
              Searching for opponent
              <span className="animate-dot">.</span>
              <span className="animate-dot-2">.</span>
              <span className="animate-dot-3">.</span>
            </Button>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      {(status === "playing" || status === "done") && match && (
        <div className="flex items-center justify-center h-[75vh]">
          <div className="space-y-6 w-full">
            <div className="grid grid-cols-1">
              <div
                className={`col-start-1 row-start-1 transition-all duration-500 ease-out ${
                  myMove !== null
                    ? "opacity-0 scale-95 translate-y-0 pointer-events-none"
                    : "opacity-100 scale-100 translate-y-0"
                }`}
              >
                {status === "playing" && myMove === null && (
                  <div>
                    <p className="text-center text-sm text-neutral-400">
                      {choiceTimeLeft !== null && choiceTimeLeft > 0 ? (
                        <div
                          className={
                            choiceTimeLeft <= 10
                              ? "text-red-400"
                              : "text-amber-400"
                          }
                        >
                          <div className="flex gap-1 justify-center items-center">
                            <Hourglass size={14} />
                            <span>{choiceTimeLeft}s</span>
                          </div>
                        </div>
                      ) : choiceTimeLeft === 0 ? (
                        <span className="text-red-500">Time's up! </span>
                      ) : null}
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      {moves.map(({ label, move, emoji: ButtonIcon }) => (
                        <button
                          key={move}
                          onClick={() => makeMove(move)}
                          className="flex flex-col cursor-pointer items-center justify-center min-h-22 bg-neutral-800 hover:bg-neutral-700 hover:scale-105 active:scale-95 rounded-xl border border-neutral-700 transition-all duration-150 p-4"
                        >
                          <ButtonIcon className="w-8 h-8 mb-2 text-neutral-200" />
                          <span className="text-xs font-medium text-neutral-300">
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`col-start-1 row-start-1 transition-all duration-500 ease-out ${
                  myMove !== null
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-4 pointer-events-none"
                }`}
              >
                <div className="relative">
                  {revealed && pendingResult && (
                    <div className="text-center mt-4 space-y-1">
                      <Badge
                        variant={
                          pendingResult.result === "win"
                            ? "win"
                            : pendingResult.result === "loss"
                              ? "loss"
                              : "draw"
                        }
                      >
                        {pendingResult.result === "win"
                          ? "WIN"
                          : pendingResult.result === "loss"
                            ? "LOSS"
                            : "TIE"}
                      </Badge>
                      <span className="text-neutral-500 ml-1">
                        {pendingResult.score[0]}-{pendingResult.score[1]}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 sm:gap-12">
                    <div className="flex flex-col items-center w-32 sm:w-40">
                      <div
                        className={`mb-2 transition-transform duration-300 ${revealed ? "scale-100" : "scale-110"}`}
                      >
                        {MyMoveIcon && (
                          <MyMoveIcon className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-400" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-neutral-300">
                        {moves.find((m) => m.move === myMove)?.label}
                      </span>
                    </div>

                    <div className="text-2xl font-bold text-neutral-500">
                      VS
                    </div>

                    <div className="flex flex-col items-center w-32 sm:w-40">
                      {revealed && pendingResult ? (
                        <div className="animate-flip-in flex flex-col items-center">
                          <div className="mb-2">
                            {OpponentMoveIcon && (
                              <OpponentMoveIcon className="w-12 h-12 sm:w-16 sm:h-16 text-red-400" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-neutral-300">
                            {
                              moves.find(
                                (m) => m.move === pendingResult.opponent_move,
                              )?.label
                            }
                          </span>
                        </div>
                      ) : (
                        <div className="backdrop-blur-sm bg-neutral-800/50 rounded-xl p-4 animate-pulse flex flex-col items-center justify-center min-h-20 min-w-20">
                          <p className="text-center text-sm text-neutral-400 mt-4">
                            <span className="animate-dot">.</span>
                            <span className="animate-dot-2">.</span>
                            <span className="animate-dot-3">.</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="text-center">
              <p className="text-sm text-neutral-400">
                BO3 vs{" "}
                <span className="font-semibold text-emerald-400">
                  {match.opponent}
                </span>{" "}
                <span className="text-neutral-500">
                  ({match.opponent_rating})
                </span>
              </p>
            </Card>

            {rounds.length > 0 && (
              <div className="space-y-1">
                {rounds.map((r) => (
                  <Card
                    key={r.round}
                    className="flex justify-between items-center py-2"
                  >
                    <span className="text-sm text-neutral-300">
                      Round {r.round}: {r.your_move} vs {r.opponent_move}
                    </span>
                    <span className="text-sm">
                      <Badge
                        variant={
                          r.result === "win"
                            ? "win"
                            : r.result === "loss"
                              ? "loss"
                              : "draw"
                        }
                      >
                        {r.result === "win"
                          ? "W"
                          : r.result === "loss"
                            ? "L"
                            : "T"}
                      </Badge>
                      <span className="text-neutral-500 ml-1">
                        {r.score[0]}-{r.score[1]}
                      </span>
                    </span>
                  </Card>
                ))}
              </div>
            )}

            {resultMsg && !revealed && !pendingResult && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <Card className="text-center space-y-3 max-w-sm w-full">
                  <p
                    className={`text-2xl font-bold ${
                      resultMsg.winner === "you"
                        ? "text-emerald-400"
                        : resultMsg.winner === "opponent"
                          ? "text-red-400"
                          : "text-neutral-400"
                    }`}
                  >
                    {resultMsg.winner === "you"
                      ? "You Win!"
                      : resultMsg.winner === "opponent"
                        ? "You Lose"
                        : "Draw"}
                  </p>
                  <p className="text-sm text-neutral-400">
                    <Badge
                      variant={
                        resultMsg.rating_change > 0
                          ? "win"
                          : resultMsg.rating_change < 0
                            ? "loss"
                            : "draw"
                      }
                    >
                      {resultMsg.rating_change > 0 ? "+" : ""}
                      {resultMsg.rating_change}
                    </Badge>
                    {" \u00b7 "}
                    {resultMsg.final_score[0]}-{resultMsg.final_score[1]}
                  </p>
                  <Button
                    onClick={handlePlayAgain}
                    className="w-full"
                    icon={SwordsIcon}
                  >
                    Play Again
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleHome}
                    className="w-full"
                    icon={X}
                  >
                    Back to Menu
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
