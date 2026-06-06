import type { ServerMessage, ClientMessage } from "../types";

export class GameSocket {
  private ws: WebSocket | null = null;
  private onMessageCallback: ((msg: ServerMessage) => void) | null = null;
  private onOpenCallback: (() => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private maxRetries = 5;
  private retries = 0;

  connect() {
    const host = import.meta.env.VITE_WS_HOST;
    this.ws = new WebSocket(host ? `${host}/api/ws` : "/api/ws");

    this.ws.onopen = () => {
      this.retries = 0;
      this.onOpenCallback?.();
    };

    this.ws.onclose = () => {
      this.onCloseCallback?.();
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data) as ServerMessage;
        this.onMessageCallback?.(msg);
      } catch {
        // ignore malformed messages
      }
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.retries = this.maxRetries;
    this.ws?.close();
    this.ws = null;
  }

  private attemptReconnect() {
    if (this.retries >= this.maxRetries) return;
    this.retries++;
    this.reconnectTimeout = setTimeout(
      () => this.connect(),
      1000 * this.retries,
    );
  }

  onMessage(cb: (msg: ServerMessage) => void) {
    this.onMessageCallback = cb;
  }

  onOpen(cb: () => void) {
    this.onOpenCallback = cb;
  }

  onClose(cb: () => void) {
    this.onCloseCallback = cb;
  }
}
