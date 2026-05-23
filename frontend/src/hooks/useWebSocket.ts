import { useEffect, useRef, useCallback } from "react"
import { GameSocket } from "../lib/ws"
import type { ServerMessage, ClientMessage } from "../types"

export function useWebSocket(
  token: string | null,
  onMessage: (msg: ServerMessage) => void,
  onOpen?: () => void,
  onClose?: () => void,
) {
  const socketRef = useRef<GameSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  const onOpenRef = useRef(onOpen)
  const onCloseRef = useRef(onClose)

  onMessageRef.current = onMessage
  onOpenRef.current = onOpen
  onCloseRef.current = onClose

  useEffect(() => {
    if (!token) return

    const socket = new GameSocket(token)
    socketRef.current = socket

    socket.onMessage((msg) => onMessageRef.current?.(msg))
    socket.onOpen(() => onOpenRef.current?.())
    socket.onClose(() => onCloseRef.current?.())
    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(msg)
  }, [])

  return { send }
}
