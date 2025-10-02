import { useEffect, useMemo, useRef, useState } from "react";

import type { GameStateDTO } from "@/lib/api";
import { createGameSocket, type GameSocketMessage } from "@/lib/ws";

const DEFAULT_STATE: GameStateDTO = { started: false };

export function useGameStateSubscription(options?: { debug?: boolean }) {
  const [state, setState] = useState<GameStateDTO>(DEFAULT_STATE);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const debug = options?.debug ?? false;

  useEffect(() => {
    const socket = createGameSocket({
      debug,
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onError: () => setConnected(false),
      onMessage: (message: GameSocketMessage) => {
        if (message.type === "connected") {
          setConnected(true);
          return;
        }
        if (message.type === "game-state") {
          setState((prev) => ({ ...prev, ...message.payload }));
        }
      },
    });

    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [debug]);

  const status = useMemo(
    () => ({
      state,
      connected,
      started: state.started,
      startedAt: state.startedAt,
      cluesUnlockedAt: state.cluesUnlockedAt,
    }),
    [connected, state]
  );

  return status;
}
