import archiver from "archiver";
import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";

import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import { buildScoreboard, parseIsoTime } from "./scoreboard.js";
import { broadcastLatestScoreboard } from "./scoreboardBroadcast.js";
import { DataShape, DEFAULT_DATA, GameState, QuizPenaltyConfig, UploadRecord } from "./types.js";
import { broadcastGameState } from "./websocket.js";

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

function sanitizeQuizPenaltyConfig(value: unknown): QuizPenaltyConfig {
  const defaults = DEFAULT_DATA.quizPenaltyConfig;
  if (!value || typeof value !== "object") {
    return { ...defaults };
  }
  const source = value as Partial<QuizPenaltyConfig>;
  const minor = Number(source.minorPenaltySeconds);
  const major = Number(source.majorPenaltySeconds);
  const safeMinor = Number.isFinite(minor) && minor >= 0 ? Math.floor(minor) : defaults.minorPenaltySeconds;
  const safeMajor = Number.isFinite(major) && major >= 0 ? Math.floor(major) : defaults.majorPenaltySeconds;
  return {
    minorPenaltySeconds: safeMinor,
    majorPenaltySeconds: safeMajor,
  };
}

function sanitizeData(payload: unknown): DataShape {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Partial<DataShape>;
  return {
    guests: toArray(raw.guests),
    groups: toArray(raw.groups),
    neverHaveIEverPacks: toArray(raw.neverHaveIEverPacks),
    quizPacks: toArray(raw.quizPacks),
    funnyQuestions: toArray(raw.funnyQuestions),
    funnyAnswers: toArray(raw.funnyAnswers),
    uploads: toArray(raw.uploads),
    gameState: sanitizeGameState(raw.gameState),
    quizPenaltyConfig: sanitizeQuizPenaltyConfig(raw.quizPenaltyConfig),
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

adminRouter.get("/uploads", requireAuth, async (_req, res) => {
  const uploadDir = path.resolve("uploads");
  try {
    const data = await loadData();
    const entries = await fs.readdir(uploadDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filePath = path.join(uploadDir, entry.name);
          const stats = await fs.stat(filePath);
          const record: UploadRecord | undefined = Array.isArray(data.uploads)
            ? data.uploads.find((item) => item.filename === entry.name)
            : undefined;
          const guest = record?.guestId ? data.guests.find((g) => g.id === record.guestId) ?? null : null;
          const group = record?.groupId ? data.groups.find((g) => g.id === record.groupId) ?? null : null;
          return {
            filename: entry.name,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
            url: `/uploads/${entry.name}`,
            guestId: record?.guestId ?? null,
            guestName: guest?.name ?? null,
            groupId: record?.groupId ?? null,
            groupName: group?.name ?? null,
            uploadedAt: record?.uploadedAt ?? stats.birthtime.toISOString(),
            challengeId: record?.challengeId ?? null,
          };
        })
    );

    files.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    res.json({ files });
  } catch (error: any) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return res.json({ files: [] });
    }
    console.error("admin uploads listing failed", error);
    res.status(500).json({ message: "Failed to read uploads directory" });
  }
});

adminRouter.post("/uploads/delete", requireAuth, async (req, res) => {
  const raw = req?.body?.filenames;
  const filenames = Array.isArray(raw)
    ? raw
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter((name) => name && !name.includes("/") && !name.includes("\\") && !name.includes(".."))
    : [];

  if (filenames.length === 0) {
    return res.status(400).json({ message: "No valid filenames provided." });
  }

  const uploadDir = path.resolve("uploads");
  const deleted: string[] = [];
  const failed: { filename: string; error: string }[] = [];

  for (const filename of filenames) {
    const filePath = path.join(uploadDir, filename);
    try {
      await fs.unlink(filePath);
      deleted.push(filename);
    } catch (error: any) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        deleted.push(filename);
      } else {
        const message = error instanceof Error ? error.message : "Unknown error";
        failed.push({ filename, error: message });
      }
    }
  }

  if (deleted.length > 0) {
    const deleteSet = new Set(deleted);
    await mutate((data) => {
      data.uploads = (data.uploads ?? []).filter((record) => !deleteSet.has(record.filename));
      return true;
    });
  }

  res.json({ deleted, failed });
});

adminRouter.post("/uploads/archive", requireAuth, async (req, res) => {
  const raw = req?.body?.filenames;
  const filenames = Array.isArray(raw)
    ? raw
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter((name) => name && !name.includes("/") && !name.includes("\\") && !name.includes(".."))
    : [];

  if (filenames.length === 0) {
    return res.status(400).json({ message: "No valid filenames provided." });
  }

  const uploadDir = path.resolve("uploads");
  const missing: string[] = [];
  const files: { filename: string; filePath: string }[] = [];

  for (const filename of filenames) {
    const filePath = path.join(uploadDir, filename);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        missing.push(filename);
        continue;
      }
      files.push({ filename, filePath });
    } catch {
      missing.push(filename);
    }
  }

  if (files.length === 0) {
    return res.status(404).json({ message: "None of the requested files exist.", missing });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveName =
    files.length === 1 ? `${files[0].filename.replace(/\.zip$/i, "")}-${timestamp}.zip` : `uploads-${timestamp}.zip`;

  res.status(200);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${archiveName}"`);
  if (missing.length > 0) {
    res.setHeader("X-Missing-Uploads", missing.join(","));
  }

  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (error: Error) => {
    console.error("admin uploads archive failed", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to create archive." });
    } else {
      res.end();
    }
  });

  archive.pipe(res);

  for (const { filename, filePath } of files) {
    archive.file(filePath, { name: filename });
  }

  void archive.finalize();
});

adminRouter.get("/quiz-penalty", requireAuth, async (_req, res) => {
  const data = await loadData();
  const defaults = DEFAULT_DATA.quizPenaltyConfig;
  const config = data.quizPenaltyConfig ?? defaults;
  res.json({
    minorPenaltySeconds: Number.isFinite(config?.minorPenaltySeconds)
      ? config.minorPenaltySeconds
      : defaults.minorPenaltySeconds,
    majorPenaltySeconds: Number.isFinite(config?.majorPenaltySeconds)
      ? config.majorPenaltySeconds
      : defaults.majorPenaltySeconds,
  });
});

adminRouter.post("/quiz-penalty", requireAuth, async (req, res) => {
  const sanitized = sanitizeQuizPenaltyConfig(req.body);

  await mutate((data) => {
    data.quizPenaltyConfig = sanitized;
    return true;
  });

  res.json({ success: true, config: sanitized, updatedAt: new Date().toISOString() });
});

adminRouter.get("/leaderboard", requireAuth, async (_req, res) => {
  const data = await loadData();
  const groups = data.groups ?? [];
  const guests = data.guests ?? [];
  const fallbackGlobalMs = parseIsoTime(data.gameState?.startedAt) ?? undefined;

  const scoreboard = buildScoreboard(groups, guests, fallbackGlobalMs);
  const scoreboardWithPlacement = scoreboard.map((entry, index) => ({ ...entry, placement: index + 1 }));
  const top = scoreboardWithPlacement.slice(0, 4);
  const others = scoreboardWithPlacement.slice(4);
  const finishedIds = new Set(scoreboard.map((entry) => entry.id));
  const unfinished = groups
    .filter((group) => !finishedIds.has(group.id))
    .map((group) => ({
      id: group.id,
      name: group.name,
      startedAt: group.startedAt ?? null,
      finishedAt: group.finishedAt ?? null,
    }));

  res.json({
    totalFinished: scoreboard.length,
    totalGroups: groups.length,
    top,
    others,
    unfinished,
    fallback: {
      gameStartedAt: data.gameState?.startedAt ?? null,
    },
  });
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
    d.funnyQuestions = sanitized.funnyQuestions;
    d.funnyAnswers = sanitized.funnyAnswers;
    d.gameState = sanitized.gameState;
    d.quizPenaltyConfig = sanitized.quizPenaltyConfig;
    return true;
  });

  broadcastGameState(sanitized.gameState);
  void broadcastLatestScoreboard();

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
  broadcastGameState(state);
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
    current.startedAt = undefined;
    current.cluesUnlockedAt = undefined;
    return { ...current };
  });
  broadcastGameState(state);
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
    d.funnyQuestions = [];
    d.funnyAnswers = [];
    d.gameState = { started: false };
    d.quizPenaltyConfig = { ...DEFAULT_DATA.quizPenaltyConfig };
    return true;
  });

  broadcastGameState({ started: false });
  void broadcastLatestScoreboard();

  res.json({ success: true, clearedAt: new Date().toISOString() });
});
