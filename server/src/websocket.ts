import type { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { loadData } from "./dataStore.js";
import type { GameState } from "./types.js";

export type OutboundMessage =
  | {
      type: "connected";
      time: string;
    }
  | {
      type: "game-state";
      payload: GameState;
    };

let wss: WebSocketServer | null = null;

function serialize(message: OutboundMessage): string {
  return JSON.stringify(message);
}

export function initWebsocket(server: HttpServer) {
  if (wss) {
    return wss;
  }

  const socketServer = new WebSocketServer({ server, path: "/api/ws" });

  socketServer.on("connection", async (socket: WebSocket) => {
    socket.send(
      serialize({
        type: "connected",
        time: new Date().toISOString(),
      })
    );

    socket.on("error", (err: Error) => {
      console.error("WebSocket client error", err);
    });

    try {
      const data = await loadData();
      const state: GameState = data.gameState ?? { started: false };
      socket.send(
        serialize({
          type: "game-state",
          payload: state,
        })
      );
    } catch (error) {
      console.error("Failed to load initial game state for websocket", error);
    }
  });

  socketServer.on("error", (err: Error) => {
    console.error("WebSocket server error", err);
  });

  wss = socketServer;
  console.log("WebSocket listening on /api/ws");

  return socketServer;
}

export function broadcastGameState(state: GameState) {
  if (!wss) return;
  const message = serialize({ type: "game-state", payload: state });
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
