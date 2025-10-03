import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import {
  FunnyAnswer,
  FunnyQuestion,
  GameState,
  NeverHaveIEverPack,
  PasswordGameConfig,
  QuizPack,
  QuizQuestion,
} from "./types.js";

export const gamesRouter = Router();

/**
 * GET /api/games/state
 *
 * Public endpoint that returns the current game state. Used by the app to determine if
 * the overall party flow has started. When no state is stored this defaults to
 * `{ started: false }`.
 *
 * Response: GameState
 */
gamesRouter.get("/state", async (_req, res) => {
  const data = await loadData();
  const state: GameState = data.gameState ?? { started: false };
  res.json(state);
});

/**
 * GET /api/games/guests/:guestId/clues
 *
 * Public endpoint that reveals the clues for a guest once the game has started. When the
 * guest is grouped, returns their partner info and group metadata so the frontend can
 * display the matching details.
 *
 * Params: guestId (string)
 * Response: { unlocked: boolean; clues: string[]; partnerId?: string | null; partnerName?: string | null; groupId?: string | null; groupName?: string | null }
 */
gamesRouter.get("/guests/:guestId/clues", async (req, res) => {
  const { guestId } = req.params;
  if (!guestId) return res.status(400).json({ message: "guestId required" });

  const data = await loadData();
  const state: GameState = data.gameState ?? { started: false };
  if (!state.started) {
    return res.json({ unlocked: false, clues: [] });
  }

  const guest = data.guests.find((g) => g.id === guestId);
  if (!guest) return res.status(404).json({ message: "guest not found" });

  const group = data.groups.find((g) => g.guestIds.includes(guestId));
  if (!group) {
    return res.json({
      unlocked: true,
      clues: [],
      groupId: null,
      groupName: null,
      partnerId: null,
    });
  }

  const partnerId = group.guestIds.find((id) => id !== guestId) ?? null;
  const partner = partnerId
    ? data.guests.find((g) => g.id === partnerId)
    : null;
  const clues = partner
    ? [partner.clue1, partner.clue2].filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0
      )
    : [];

  res.json({
    unlocked: true,
    clues,
    partnerId,
    partnerName: partner?.name ?? null,
    groupId: group.id,
    groupName: group.name,
  });
});

/**
 * POST /api/games/partner/verify
 *
 * Public endpoint where a guest submits who they think their partner is. Validates the
 * pairing against the group assignments and updates progress when the match is correct.
 *
 * Body: { guestId: string; partnerId: string }
 * Response: { match: boolean; groupId?: string; groupName?: string; partner?: { id: string; name: string }; completedGames?: string[]; completedCount?: number }
 */
gamesRouter.post("/partner/verify", async (req, res) => {
  const { guestId, partnerId } = req.body || {};
  if (!guestId || !partnerId) {
    return res.status(400).json({ message: "guestId and partnerId required" });
  }

  const outcome = await mutate((d) => {
    if (!d.gameState) {
      d.gameState = { started: false };
    }
    if (!d.gameState.started) {
      return { error: { status: 409, message: "game not started" } };
    }

    const guest = d.guests.find((g) => g.id === guestId);
    const partner = d.guests.find((g) => g.id === partnerId);

    if (!guest || !partner) {
      return { error: { status: 404, message: "guest not found" } };
    }

    if (guest.id === partner.id) {
      return { match: false };
    }

    const group = d.groups.find((g) => g.guestIds.includes(guest.id));
    const partnerGroup = d.groups.find((g) => g.guestIds.includes(partner.id));

    if (group && partnerGroup && group.id === partnerGroup.id) {
      if (!Array.isArray(group.progress.completedGames)) {
        group.progress.completedGames = [];
      }
      if (!group.progress.completedGames.includes("partner-found")) {
        group.progress.completedGames.push("partner-found");
      }
      group.progress.currentGame = "partner-found";

      return {
        match: true,
        groupId: group.id,
        groupName: group.name,
        partner: { id: partner.id, name: partner.name },
        completedGames: group.progress.completedGames,
        completedCount: group.progress.completedGames.length,
      };
    }

    return { match: false };
  });

  if ("error" in outcome) {
    const error = outcome.error;
    const status = error?.status ?? 400;
    const message = error?.message ?? "request failed";
    return res.status(status).json({ message });
  }

  res.json(outcome);
});

/**
 * POST /api/games/groups/:groupId/progress
 *
 * Records that a group finished a specific mini game. Intended for public usage when the
 * app advances the group to the next challenge. Updates the group's progress tracking.
 *
 * Params: groupId (string)
 * Body: { gameId: string }
 * Response: { success: true; completedGames: string[]; completedCount: number }
 */
gamesRouter.post("/groups/:groupId/progress", async (req, res) => {
  const { groupId } = req.params;
  const { gameId } = req.body || {};

  if (!groupId) return res.status(400).json({ message: "groupId required" });
  if (!gameId || typeof gameId !== "string") {
    return res.status(400).json({ message: "gameId (string) required" });
  }

  const result = await mutate((d) => {
    const group = d.groups.find((g) => g.id === groupId);
    if (!group) {
      return { error: { status: 404, message: "group not found" } };
    }
    if (!Array.isArray(group.progress.completedGames)) {
      group.progress.completedGames = [];
    }
    if (!group.progress.completedGames.includes(gameId)) {
      group.progress.completedGames.push(gameId);
    }
    group.progress.currentGame = gameId;
    return {
      success: true,
      completedGames: group.progress.completedGames,
      completedCount: group.progress.completedGames.length,
    };
  });

  if ("error" in result) {
    const error = result.error;
    const status = error?.status ?? 400;
    const message = error?.message ?? "request failed";
    return res.status(status).json({ message });
  }

  res.json(result);
});

async function ensureSingleNeverHaveIEverPack(): Promise<NeverHaveIEverPack> {
  return mutate((d) => {
    const entries = d.neverHaveIEverPacks as unknown[];
    const seen = new Set<string>();
    const statements: string[] = [];

    const collectStatement = (value: unknown) => {
      if (typeof value !== "string") {
        value = value != null ? String(value) : "";
      }
      const text = (value as string).trim();
      if (!text) return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      statements.push(text);
    };

    let primary: NeverHaveIEverPack | null = null;

    for (const entry of entries) {
      if (
        entry &&
        typeof entry === "object" &&
        "statements" in (entry as any)
      ) {
        const pack = entry as Partial<NeverHaveIEverPack> & {
          statements?: unknown;
        };
        if (!primary) {
          primary = {
            id:
              typeof pack.id === "string" && pack.id ? pack.id : "nhie-default",
            title:
              typeof pack.title === "string" && pack.title
                ? pack.title
                : "Standard Pack",
            statements: [],
          };
        }
        if (Array.isArray(pack.statements)) {
          for (const statement of pack.statements) {
            collectStatement(statement);
          }
        }
      } else {
        collectStatement(entry);
      }
    }

    if (!primary) {
      primary = {
        id: "nhie-default",
        title: "Standard Pack",
        statements: [],
      };
    }

    primary.statements = statements;
    d.neverHaveIEverPacks = [primary];
    return primary;
  });
}

async function ensureSingleQuizPack(): Promise<QuizPack> {
  const data = await loadData();
  if (data.quizPacks.length === 0) {
    return mutate((d) => {
      const pack: QuizPack = {
        id: "quiz-default",
        title: "Standard Quiz",
        questions: [],
      };
      d.quizPacks.push(pack);
      return pack;
    });
  }
  if (data.quizPacks.length === 1) {
    return data.quizPacks[0]!;
  }
  return mutate((d) => {
    const [primary, ...rest] = d.quizPacks;
    rest.forEach((pack) => {
      pack.questions.forEach((question) => {
        if (
          !primary.questions.some((existing) => existing.id === question.id)
        ) {
          primary.questions.push(question);
        }
      });
    });
    d.quizPacks = [primary];
    return primary;
  });
}

// QUIZ PACKS
/**
 * GET /api/games/quiz
 *
 * Returns the single canonical quiz pack. The backend deduplicates packs into one entry
 * so the frontend always receives an array with a single pack record.
 *
 * Response: QuizPack[]
 */
gamesRouter.get("/quiz", async (_req, res) => {
  const pack = await ensureSingleQuizPack();
  console.log(pack);
  res.json([pack]);
});

/**
 * POST /api/games/quiz
 *
 * Creates a new quiz pack. Requires admin authentication. Optional `questions` array can
 * be pre-populated; otherwise the pack starts empty.
 *
 * Body: { title: string; questions?: QuizQuestion[] }
 * Response: QuizPack (201 Created)
 */
gamesRouter.post("/quiz", requireAuth, async (req, res) => {
  const { title, questions } = req.body || {};
  if (!title) return res.status(400).json({ message: "title required" });
  const pack: QuizPack = { id: nanoid(8), title: String(title), questions: [] };
  if (Array.isArray(questions)) {
    pack.questions = questions as QuizQuestion[];
  }
  await mutate((d) => {
    d.quizPacks.push(pack);
    return pack;
  });
  res.status(201).json(pack);
});

/**
 * PUT /api/games/quiz/:packId
 *
 * Updates metadata for an existing quiz pack. Requires admin authentication. Currently
 * only supports renaming the pack.
 *
 * Params: packId (string)
 * Body: { title?: string }
 * Response: QuizPack
 */
gamesRouter.put("/quiz/:packId", requireAuth, async (req, res) => {
  const { packId } = req.params;
  const { title } = req.body || {};
  const updated = await mutate((d) => {
    const pack = d.quizPacks.find((p) => p.id === packId);
    if (!pack) return null;
    if (title !== undefined) pack.title = String(title);
    return pack;
  });
  if (!updated) return res.status(404).json({ message: "pack not found" });
  res.json(updated);
});

/**
 * DELETE /api/games/quiz/:packId
 *
 * Removes a quiz pack by id. Requires admin authentication. Returns 204 when the pack is
 * deleted or 404 if it does not exist.
 */
gamesRouter.delete("/quiz/:packId", requireAuth, async (req, res) => {
  const { packId } = req.params;
  const ok = await mutate((d) => {
    const idx = d.quizPacks.findIndex((p) => p.id === packId);
    if (idx === -1) return false;
    d.quizPacks.splice(idx, 1);
    return true;
  });
  if (!ok) return res.status(404).json({ message: "pack not found" });
  res.status(204).end();
});

/**
 * POST /api/games/quiz/:packId/questions
 *
 * Adds a new quiz question to an existing pack. Requires admin authentication. The
 * payload must include the question text and at least two answers.
 *
 * Params: packId (string)
 * Body: { question: string; answers: string[]; difficulty?: QuizQuestion['difficulty']; imageUrl?: string }
 * Response: QuizQuestion (201 Created)
 */
gamesRouter.post("/quiz/:packId/questions", requireAuth, async (req, res) => {
  const { packId } = req.params;
  const { question, answers, difficulty, imageUrl } = req.body || {};
  if (!question) return res.status(400).json({ message: "question required" });
  if (!Array.isArray(answers) || answers.length < 2)
    return res.status(400).json({ message: "answers min 2" });
  const q: QuizQuestion = {
    id: nanoid(8),
    question,
    answers,
    difficulty,
    imageUrl,
  };
  const updated = await mutate((d) => {
    const pack = d.quizPacks.find((p) => p.id === packId);
    if (!pack) return null;
    pack.questions.push(q);
    return q;
  });
  if (!updated) return res.status(404).json({ message: "pack not found" });
  res.status(201).json(updated);
});

/**
 * PUT /api/games/quiz/:packId/questions/:qid
 *
 * Updates an existing quiz question. Requires admin authentication. Any supplied fields
 * override the stored version.
 *
 * Params: packId (string), qid (string)
 * Body: { question?: string; answers?: string[]; difficulty?: QuizQuestion['difficulty']; imageUrl?: string }
 * Response: QuizQuestion
 */
gamesRouter.put(
  "/quiz/:packId/questions/:qid",
  requireAuth,
  async (req, res) => {
    const { packId, qid } = req.params;
    const { question, answers, difficulty, imageUrl } = req.body || {};
    const updated = await mutate((d) => {
      const pack = d.quizPacks.find((p) => p.id === packId);
      if (!pack) return null;
      const q = pack.questions.find((item) => item.id === qid);
      if (!q) return null;
      if (question !== undefined) q.question = question;
      if (answers) q.answers = answers as QuizQuestion["answers"];
      if (difficulty !== undefined) q.difficulty = difficulty;
      if (imageUrl !== undefined) q.imageUrl = imageUrl;
      return q;
    });
    if (!updated)
      return res.status(404).json({ message: "question not found" });
    res.json(updated);
  }
);

/**
 * DELETE /api/games/quiz/:packId/questions/:qid
 *
 * Deletes a question from the specified quiz pack. Requires admin authentication.
 * Returns 204 when removed or 404 if the question is missing.
 */
gamesRouter.delete(
  "/quiz/:packId/questions/:qid",
  requireAuth,
  async (req, res) => {
    const { packId, qid } = req.params;
    const ok = await mutate((d) => {
      const pack = d.quizPacks.find((p) => p.id === packId);
      if (!pack) return false;
      const idx = pack.questions.findIndex((question) => question.id === qid);
      if (idx === -1) return false;
      pack.questions.splice(idx, 1);
      return true;
    });
    if (!ok) return res.status(404).json({ message: "question not found" });
    res.status(204).end();
  }
);

async function ensureSinglePasswordConfig(): Promise<PasswordGameConfig> {
  return mutate((d) => {
    const entries = d.passwordGames as unknown[];
    let firstConfig: Partial<PasswordGameConfig> | null = null;
    const collected: string[] = [];
    const seen = new Set<string>();
    let aggregatedActive = false;
    let aggregatedStartedAt: string | undefined;
    let aggregatedEndedAt: string | undefined;
    let aggregatedUpdatedAt: string | undefined;
    let aggregatedRequired: number | undefined;

    const collect = (value: unknown) => {
      if (typeof value !== "string") {
        value = value != null ? String(value) : "";
      }
      const text = (value as string).trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      collected.push(text);
    };

    const pickEarliest = (current: string | undefined, next?: string) => {
      if (!next) return current;
      if (!current || next < current) return next;
      return current;
    };

    const pickLatest = (current: string | undefined, next?: string) => {
      if (!next) return current;
      if (!current || next > current) return next;
      return current;
    };

    for (const entry of entries) {
      if (
        entry &&
        typeof entry === "object" &&
        Array.isArray((entry as any).validPasswords)
      ) {
        const cfg = entry as Partial<PasswordGameConfig> & {
          validPasswords: unknown[];
        };
        if (!firstConfig) {
          firstConfig = { ...cfg };
        }
        aggregatedActive = aggregatedActive || !!cfg.active;
        aggregatedStartedAt = pickEarliest(aggregatedStartedAt, cfg.startedAt);
        aggregatedEndedAt = pickLatest(aggregatedEndedAt, cfg.endedAt);
        aggregatedUpdatedAt = pickLatest(aggregatedUpdatedAt, cfg.updatedAt);
        if (
          aggregatedRequired === undefined &&
          typeof cfg.requiredCorrectGroups === "number"
        ) {
          aggregatedRequired = cfg.requiredCorrectGroups;
        }
        for (const pwd of cfg.validPasswords) {
          collect(pwd);
        }
      } else {
        collect(entry);
      }
    }

    if (!firstConfig) {
      firstConfig = {
        id: "password-default",
        validPasswords: [],
        active: false,
      };
    }

    const primary: PasswordGameConfig = {
      id:
        typeof firstConfig.id === "string" && firstConfig.id
          ? firstConfig.id
          : "password-default",
      validPasswords: collected,
      active: aggregatedActive || !!firstConfig.active,
      requiredCorrectGroups:
        aggregatedRequired !== undefined
          ? aggregatedRequired
          : firstConfig.requiredCorrectGroups,
      startedAt: aggregatedStartedAt ?? firstConfig.startedAt,
      endedAt: aggregatedEndedAt ?? firstConfig.endedAt,
      updatedAt: aggregatedUpdatedAt ?? firstConfig.updatedAt,
    };

    if (primary.requiredCorrectGroups === undefined) {
      delete primary.requiredCorrectGroups;
    }

    d.passwordGames = [primary];
    return primary;
  });
}

// NEVER HAVE I EVER PACKS
// GET all packs
// POST create { title, statements[] }
// PUT update
// DELETE remove

/**
 * GET /api/games/never-have-i-ever
 *
 * Returns the single aggregated "Never Have I Ever" pack. Deduplicates statements so the
 * frontend always receives one pack with unique statements. Publicly accessible.
 *
 * Response: NeverHaveIEverPack[]
 */
gamesRouter.get("/never-have-i-ever", async (_req, res) => {
  const pack = await ensureSingleNeverHaveIEverPack();
  res.json([pack]);
});

/**
 * POST /api/games/never-have-i-ever
 *
 * Creates a new Never Have I Ever pack. Requires admin authentication. Statements are
 * sanitized to strings before persisting.
 *
 * Body: { title: string; statements?: unknown[] }
 * Response: NeverHaveIEverPack (201 Created)
 */
gamesRouter.post("/never-have-i-ever", requireAuth, async (req, res) => {
  const { title, statements } = req.body || {};
  if (!title) return res.status(400).json({ message: "title required" });
  const sanitizedStatements = Array.isArray(statements)
    ? statements.map((s: unknown) => String(s))
    : [];
  const pack: NeverHaveIEverPack = {
    id: nanoid(8),
    title,
    statements: sanitizedStatements,
  };
  await mutate((d) => {
    d.neverHaveIEverPacks.push(pack);
    return pack;
  });
  res.status(201).json(pack);
});

// put and delete for never have i ever
/**
 * PUT /api/games/never-have-i-ever/:packId
 *
 * Updates an existing Never Have I Ever pack. Requires admin authentication. Allows
 * renaming the pack and replacing the full statements array.
 *
 * Params: packId (string)
 * Body: { title?: string; statements?: unknown[] }
 * Response: NeverHaveIEverPack
 */
gamesRouter.put("/never-have-i-ever/:packId", requireAuth, async (req, res) => {
  const { packId } = req.params;
  const { title, statements } = req.body || {};
  const updated = await mutate((d) => {
    const pack = d.neverHaveIEverPacks.find((p) => p.id === packId);
    if (!pack) return null;
    if (title !== undefined) pack.title = String(title);
    if (Array.isArray(statements)) {
      pack.statements = statements.map((s) => String(s));
    }
    return pack;
  });
  if (!updated) return res.status(404).json({ message: "pack not found" });
  res.json(updated);
});

/**
 * DELETE /api/games/never-have-i-ever/:packId
 *
 * Removes the specified Never Have I Ever pack. Requires admin authentication. Returns
 * 204 on success or 404 if the pack cannot be found.
 */
gamesRouter.delete(
  "/never-have-i-ever/:packId",
  requireAuth,
  async (req, res) => {
    const { packId } = req.params;
    const ok = await mutate((d) => {
      const idx = d.neverHaveIEverPacks.findIndex((p) => p.id === packId);
      if (idx === -1) return false;
      d.neverHaveIEverPacks.splice(idx, 1);
      return true;
    });
    if (!ok) return res.status(404).json({ message: "pack not found" });
    res.status(204).end();
  }
);

/**
 * GET /api/games/password-game
 *
 * Public endpoint that returns the active password game configuration. The backend
 * condenses legacy entries so there is always a single source of truth.
 *
 * Response: PasswordGameConfig
 */
gamesRouter.get("/password-game", async (_req, res) => {
  const config = await ensureSinglePasswordConfig();
  res.json(config);
});

/**
 * POST /api/games/password-game
 *
 * Replaces the stored password game configuration. Requires admin authentication. When
 * activating, timestamps are updated and `endedAt` cleared.
 *
 * Body: { validPasswords?: string[]; active?: boolean }
 * Response: PasswordGameConfig
 */
gamesRouter.post("/password-game", requireAuth, async (req, res) => {
  const { validPasswords, active } = req.body || {};
  await ensureSinglePasswordConfig();
  const updated = await mutate((d) => {
    let cfg = d.passwordGames[0];
    if (!cfg) {
      cfg = { id: "password-default", validPasswords: [], active: false };
      d.passwordGames = [cfg];
    }
    if (Array.isArray(validPasswords)) {
      const sanitized = validPasswords
        .map((value) => (value != null ? String(value).trim() : ""))
        .filter(Boolean);
      cfg.validPasswords = Array.from(new Set(sanitized));
    }
    if (typeof active === "boolean") {
      cfg.active = active;
      if (active) {
        cfg.startedAt = cfg.startedAt ?? new Date().toISOString();
        cfg.endedAt = undefined;
      } else {
        cfg.endedAt = cfg.endedAt ?? new Date().toISOString();
      }
    }
    cfg.updatedAt = new Date().toISOString();
    return cfg;
  });
  res.json(updated);
});

/**
 * PATCH /api/games/password-game
 *
 * Partially updates the password game configuration. Requires admin authentication.
 * Behaves like POST but only mutates supplied fields.
 *
 * Body: { validPasswords?: string[]; active?: boolean }
 * Response: PasswordGameConfig
 */
gamesRouter.patch("/password-game", requireAuth, async (req, res) => {
  const { validPasswords, active } = req.body || {};
  await ensureSinglePasswordConfig();
  const updated = await mutate((d) => {
    const cfg = d.passwordGames[0]!;
    if (Array.isArray(validPasswords)) {
      const sanitized = validPasswords
        .map((value) => (value != null ? String(value).trim() : ""))
        .filter(Boolean);
      cfg.validPasswords = Array.from(new Set(sanitized));
    }
    if (typeof active === "boolean") {
      cfg.active = active;
      if (active) {
        cfg.startedAt = cfg.startedAt ?? new Date().toISOString();
        cfg.endedAt = undefined;
      } else {
        cfg.endedAt = cfg.endedAt ?? new Date().toISOString();
      }
    }
    cfg.updatedAt = new Date().toISOString();
    return cfg;
  });
  res.json(updated);
});

const passwordStartPaths = ["/password-game/start", "/password-game/:id/start"];
/**
 * POST /api/games/password-game/start
 * POST /api/games/password-game/:id/start
 *
 * Admin endpoint to force start a password game configuration. Resets timestamps and marks
 * the game as active regardless of previous state.
 *
 * Response: PasswordGameConfig
 */
gamesRouter.post(passwordStartPaths, requireAuth, async (_req, res) => {
  await ensureSinglePasswordConfig();
  const updated = await mutate((d) => {
    const cfg = d.passwordGames[0]!;
    cfg.active = true;
    cfg.startedAt = new Date().toISOString();
    cfg.endedAt = undefined;
    cfg.updatedAt = new Date().toISOString();
    return cfg;
  });
  res.json(updated);
});

const passwordAttemptPaths = [
  "/password-game/attempt",
  "/password-game/:id/attempt",
];
/**
 * POST /api/games/password-game/attempt
 * POST /api/games/password-game/:id/attempt
 *
 * Public endpoint used by groups to attempt the password challenge. Increments attempt
 * counters, records success, and automatically finishes the game when the required number
 * of groups solve the password.
 *
 * Body: { groupId: string; password: string }
 * Response: { correct: boolean; solved: boolean; ended: boolean }
 */
gamesRouter.post(passwordAttemptPaths, async (req, res) => {
  const { groupId, password } = req.body || {};
  if (!groupId || !password)
    return res.status(400).json({ message: "groupId & password required" });
  const result = await mutate((d) => {
    const configs = d.passwordGames;
    const pathId = req.params.id;
    let cfg = configs.find((p) => p.active && (!pathId || p.id === pathId));
    if (!cfg) {
      cfg = configs.find((p) => p.active);
    }
    if (!cfg) return { error: "not active" };
    const group = d.groups.find((g) => g.id === groupId);
    if (!group) return { error: "group not found" };
    group.progress.attempts = (group.progress.attempts || 0) + 1;
    const correct = cfg.validPasswords.includes(password);
    if (correct) {
      group.passwordSolved = true;
      group.finishedAt = new Date().toISOString();
      const solved = d.groups.filter((g) => g.passwordSolved).length;
      const required =
        typeof cfg.requiredCorrectGroups === "number"
          ? cfg.requiredCorrectGroups
          : Infinity;
      if (required !== Infinity && solved >= required && !cfg.endedAt) {
        cfg.endedAt = new Date().toISOString();
        cfg.active = false;
      }
    }
    return { correct, solved: !!group.passwordSolved, ended: !!cfg.endedAt };
  });
  if ("error" in result) return res.status(400).json({ message: result.error });
  res.json(result);
});

const passwordAddPaths = [
  "/password-game/passwords",
  "/password-game/:id/passwords",
];
/**
 * POST /api/games/password-game/passwords
 * POST /api/games/password-game/:id/passwords
 *
 * Admin endpoint to append a single valid password to the active configuration. Trims
 * input and prevents duplicates.
 *
 * Body: { password: string }
 * Response: PasswordGameConfig
 */
gamesRouter.post(passwordAddPaths, requireAuth, async (req, res) => {
  const { password } = req.body || {};
  const value =
    typeof password === "string"
      ? password.trim()
      : String(password ?? "").trim();
  if (!value) return res.status(400).json({ message: "password required" });
  await ensureSinglePasswordConfig();
  const updated = await mutate((d) => {
    const cfg = d.passwordGames[0]!;
    if (!cfg.validPasswords.includes(value)) {
      cfg.validPasswords.push(value);
      cfg.updatedAt = new Date().toISOString();
    }
    return cfg;
  });
  res.json(updated);
});

const passwordRemovePaths = [
  "/password-game/passwords/:password",
  "/password-game/:id/passwords/:password",
];
/**
 * DELETE /api/games/password-game/passwords/:password
 * DELETE /api/games/password-game/:id/passwords/:password
 *
 * Admin endpoint to remove a specific password from the configuration. Returns 204 when
 * removed or 404 if the password was not present.
 */
gamesRouter.delete(passwordRemovePaths, requireAuth, async (req, res) => {
  const raw = req.params.password ?? "";
  const target = decodeURIComponent(raw);
  await ensureSinglePasswordConfig();
  const ok = await mutate((d) => {
    const cfg = d.passwordGames[0]!;
    const idx = cfg.validPasswords.findIndex((p) => p === target);
    if (idx === -1) return false;
    cfg.validPasswords.splice(idx, 1);
    cfg.updatedAt = new Date().toISOString();
    return true;
  });
  if (!ok) return res.status(404).json({ message: "password not found" });
  res.status(204).end();
});

// Funny Questions Admin

const funnyQuestionPaths = ["/funny-questions", "/funny-question"];

/**
 * GET /api/games/funny-questions
 * GET /api/games/funny-question
 *
 * Admin-only endpoint that lists all funny questions so moderators can manage the pool.
 *
 * Response: FunnyQuestion[]
 */
gamesRouter.get(funnyQuestionPaths, async (_req, res) => {
  const data = await loadData();
  res.json(data.funnyQuestions);
});

/**
 * POST /api/games/funny-questions
 * POST /api/games/funny-question
 *
 * Admin endpoint to create a funny question. Persists timestamps for auditing and returns
 * the created record.
 *
 * Body: { question: string }
 * Response: FunnyQuestion (201 Created)
 */
gamesRouter.post(funnyQuestionPaths, requireAuth, async (req, res) => {
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ message: "question required" });
  const now = new Date().toISOString();
  const record: FunnyQuestion = {
    id: nanoid(8),
    question: String(question),
    createdAt: now,
    updatedAt: now,
  };
  await mutate((d) => {
    d.funnyQuestions.push(record);
    return record;
  });
  res.status(201).json(record);
});

/**
 * PUT /api/games/funny-questions/:id
 * PUT /api/games/funny-question/:id
 *
 * Admin endpoint to edit an existing funny question. Only the question text is mutable;
 * updating it refreshes the `updatedAt` timestamp.
 *
 * Params: id (string)
 * Body: { question?: string }
 * Response: FunnyQuestion
 */
gamesRouter.put(
  funnyQuestionPaths.map((path) => `${path}/:id`),
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    const { question } = req.body || {};
    const updated = await mutate((d) => {
      const fq = d.funnyQuestions.find((q) => q.id === id);
      if (!fq) return null;
      if (question !== undefined) {
        fq.question = String(question);
        fq.updatedAt = new Date().toISOString();
      }
      return fq;
    });
    if (!updated)
      return res.status(404).json({ message: "question not found" });
    res.json(updated);
  }
);

/**
 * DELETE /api/games/funny-questions/:id
 * DELETE /api/games/funny-question/:id
 *
 * Admin endpoint that removes a funny question and any associated answers. Returns 204 on
 * success or 404 if the question cannot be located.
 */
gamesRouter.delete(
  funnyQuestionPaths.map((path) => `${path}/:id`),
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    const ok = await mutate((d) => {
      const idx = d.funnyQuestions.findIndex((q) => q.id === id);
      if (idx === -1) return false;
      d.funnyQuestions.splice(idx, 1);
      d.funnyAnswers = d.funnyAnswers.filter((a) => a.questionId !== id);
      return true;
    });
    if (!ok) return res.status(404).json({ message: "question not found" });
    res.status(204).end();
  }
);

/**
 * GET /api/games/funny-questions/:id/answers
 * GET /api/games/funny-question/:id/answers
 *
 * Admin endpoint that returns a question along with all submitted answers for review.
 * Responds with 404 when the question id is invalid.
 *
 * Params: id (string)
 * Response: { question: FunnyQuestion; answers: FunnyAnswer[] }
 */
gamesRouter.get(
  funnyQuestionPaths.map((path) => `${path}/:id/answers`),
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    const data = await loadData();
    const question = data.funnyQuestions.find((q) => q.id === id);
    if (!question)
      return res.status(404).json({ message: "question not found" });
    const answers = data.funnyAnswers.filter((a) => a.questionId === id);
    res.json({ question, answers });
  }
);

/**
 * DELETE /api/games/funny-questions/:id/answers/:answerId
 * DELETE /api/games/funny-question/:id/answers/:answerId
 *
 * Admin endpoint to delete an individual funny answer submission. Ensures the answer
 * belongs to the specified question before removal.
 */
gamesRouter.delete(
  funnyQuestionPaths.map((path) => `${path}/:id/answers/:answerId`),
  requireAuth,
  async (req, res) => {
    const { id, answerId } = req.params;
    const ok = await mutate((d) => {
      const question = d.funnyQuestions.find((q) => q.id === id);
      if (!question) return false;
      const idx = d.funnyAnswers.findIndex(
        (a) => a.id === answerId && a.questionId === id
      );
      if (idx === -1) return false;
      d.funnyAnswers.splice(idx, 1);
      return true;
    });
    if (!ok) return res.status(404).json({ message: "answer not found" });
    res.status(204).end();
  }
);

// Public submission endpoint remains available
/**
 * POST /api/games/funny-answers/:id
 *
 * Public endpoint that allows guests to submit their answer for a given funny question.
 * Associates the response with the guest and timestamps the entry.
 *
 * Params: id (string)
 * Body: { answer: string; guestId: string }
 * Response: FunnyAnswer (201 Created)
 */
gamesRouter.post("/funny-answers/:id", async (req, res) => {
  const { id } = req.params;
  const { answer, guestId } = req.body || {};
  if (!answer) {
    return res.status(400).json({ message: "answer required" });
  }
  if (!guestId) {
    return res.status(400).json({ message: "guestId required" });
  }
  const result = await mutate((d) => {
    const question = d.funnyQuestions.find((q) => q.id === id);
    if (!question) return null;
    const record: FunnyAnswer = {
      id: nanoid(10),
      questionId: id,
      guestId: String(guestId),
      answer: String(answer),
      createdAt: new Date().toISOString(),
    };
    d.funnyAnswers.push(record);
    return record;
  });
  if (!result) return res.status(404).json({ message: "question not found" });
  res.status(201).json(result);
});
