import { Router } from "express";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import { DataShape, GameState } from "./types.js";

export const adminRouter = Router();

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

function sanitizeGameState(value: unknown): GameState {
  if (!value || typeof value !== "object") {
    return { started: false };
  }
  const source = value as Partial<GameState>;
  return {
    started: Boolean(source.started),
    startedAt: typeof source.startedAt === "string" ? source.startedAt : undefined,
    cluesUnlockedAt: typeof source.cluesUnlockedAt === "string" ? source.cluesUnlockedAt : undefined,
  };
}

function sanitizeData(payload: unknown): DataShape {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Partial<DataShape>;
  return {
    guests: toArray(raw.guests),
    groups: toArray(raw.groups),
    neverHaveIEverPacks: toArray(raw.neverHaveIEverPacks),
    quizPacks: toArray(raw.quizPacks),
    passwordGames: toArray(raw.passwordGames),
    funnyQuestions: toArray(raw.funnyQuestions),
    funnyAnswers: toArray(raw.funnyAnswers),
    gameState: sanitizeGameState(raw.gameState),
  };
}

/**
 * GET /api/admin/data
 *
 * Returns the full persisted dataset so the admin client can download a JSON backup.
 * Requires a valid admin Bearer token via {@link requireAuth}.
 *
 * Response: {@link DataShape}
 */
adminRouter.get("/data", requireAuth, async (_req, res) => {
  const data = await loadData();
  res.json(data);
});

/**
 * POST /api/admin/data
 *
 * Replaces the entire dataset with a sanitized payload produced from a JSON import.
 * Requires admin authentication. The request body should mirror {@link DataShape}.
 *
 * Body: Partial<DataShape>
 * Response: { success: boolean; importedAt: string }
 */
adminRouter.post("/data", requireAuth, async (req, res) => {
  const sanitized = sanitizeData(req.body);

  await mutate((d) => {
    d.guests = sanitized.guests;
    d.groups = sanitized.groups;
    d.neverHaveIEverPacks = sanitized.neverHaveIEverPacks;
    d.quizPacks = sanitized.quizPacks;
    d.passwordGames = sanitized.passwordGames;
    d.funnyQuestions = sanitized.funnyQuestions;
    d.funnyAnswers = sanitized.funnyAnswers;
    d.gameState = sanitized.gameState;
    return true;
  });

  res.json({ success: true, importedAt: new Date().toISOString() });
});

/**
 * GET /api/admin/game-state
 *
 * Fetches the current orchestration status for the party games (e.g. whether clues are unlocked).
 * Useful for restoring admin UI state across sessions. Requires admin authentication.
 *
 * Response: {@link GameState}
 */
adminRouter.get("/game-state", requireAuth, async (_req, res) => {
  const data = await loadData();
  const state = data.gameState ?? { started: false };
  res.json(state);
});

/**
 * POST /api/admin/game/start
 *
 * Marks the games as started and records timestamps. This endpoint unlocks partner clues
 * for all guests. It is idempotent and always returns the latest state. Requires admin auth.
 *
 * Response: { success: boolean; state: GameState }
 */
adminRouter.post("/game/start", requireAuth, async (_req, res) => {
  const state = await mutate((d) => {
    if (!d.gameState) {
      d.gameState = { started: false };
    }
    const current = d.gameState;
    const now = new Date().toISOString();
    if (!current.started) {
      current.started = true;
      current.startedAt = current.startedAt ?? now;
      current.cluesUnlockedAt = now;
    } else if (!current.cluesUnlockedAt) {
      current.cluesUnlockedAt = now;
    }
    return { ...current };
  });
  res.json({ success: true, state });
});

/**
 * POST /api/admin/game/reset
 *
 * Resets the orchestration state without touching guests or groups. Partner clues become
 * hidden again until `/api/admin/game/start` is called. Requires admin authentication.
 *
 * Response: { success: boolean; state: GameState }
 */
adminRouter.post("/game/reset", requireAuth, async (_req, res) => {
  const state = await mutate((d) => {
    if (!d.gameState) {
      d.gameState = { started: false };
    }
    const current = d.gameState;
    current.started = false;
    current.cluesUnlockedAt = undefined;
    return { ...current };
  });
  res.json({ success: true, state });
});

/**
 * POST /api/admin/clear-data
 *
 * Permanently wipes every collection (guests, groups, games, etc.) and resets the game state.
 * Requires admin authentication. Intended for end-of-party cleanup.
 *
 * Response: { success: boolean; clearedAt: string }
 */
adminRouter.post("/clear-data", requireAuth, async (_req, res) => {
  await mutate((d) => {
    d.guests = [];
    d.groups = [];
    d.neverHaveIEverPacks = [];
    d.quizPacks = [];
    d.passwordGames = [];
    d.funnyQuestions = [];
    d.funnyAnswers = [];
    d.gameState = { started: false };
    return true;
  });

  res.json({ success: true, clearedAt: new Date().toISOString() });
});
