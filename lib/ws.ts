import type { GameStateDTO } from "./api";
import { api } from "./api";

export type GameSocketMessage = { type: "connected"; time: string } | { type: "game-state"; payload: GameStateDTO };

export interface GameSocketOptions {
  debug?: boolean;
  onMessage?: (message: GameSocketMessage) => void;
  onError?: (event: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

function buildWebsocketUrl(path: string) {
  const base = api.getBaseUrl();
  const url = new URL(path, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function createGameSocket(options: GameSocketOptions = {}): WebSocket {
  const url = buildWebsocketUrl("/api/ws");
  const socket = new WebSocket(url);

  if (options.onOpen) {
    socket.addEventListener("open", options.onOpen);
  }
  if (options.onClose) {
    socket.addEventListener("close", options.onClose);
  }
  if (options.onError) {
    socket.addEventListener("error", options.onError);
  }

  socket.addEventListener("message", (event) => {
    if (!options.onMessage) return;

    try {
      const data = typeof event.data === "string" ? event.data : event.data?.toString?.();
      if (!data) return;
      const parsed = JSON.parse(data) as GameSocketMessage;
      if (options.debug) {
        console.log("[ws] message", parsed);
      }
      options.onMessage(parsed);
    } catch (error) {
      if (options.debug) {
        console.warn("[ws] failed to parse message", error);
      }
    }
  });

  return socket;
}
