import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import { FunnyAnswer, FunnyQuestion, NeverHaveIEverPack, PasswordGameConfig, QuizPack, QuizQuestion } from "./types.js";

export const gamesRouter = Router();

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
      if (entry && typeof entry === "object" && "statements" in (entry as any)) {
        const pack = entry as Partial<NeverHaveIEverPack> & {
          statements?: unknown;
        };
        if (!primary) {
          primary = {
            id: typeof pack.id === "string" && pack.id ? pack.id : "nhie-default",
            title: typeof pack.title === "string" && pack.title ? pack.title : "Standard Pack",
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
        if (!primary.questions.some((existing) => existing.id === question.id)) {
          primary.questions.push(question);
        }
      });
    });
    d.quizPacks = [primary];
    return primary;
  });
}

// QUIZ PACKS
gamesRouter.get("/quiz", async (_req, res) => {
  const pack = await ensureSingleQuizPack();
  res.json([pack]);
});

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

gamesRouter.post("/quiz/:packId/questions", requireAuth, async (req, res) => {
  const { packId } = req.params;
  const { question, answers, difficulty, imageUrl } = req.body || {};
  if (!question) return res.status(400).json({ message: "question required" });
  if (!Array.isArray(answers) || answers.length < 2) return res.status(400).json({ message: "answers min 2" });
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

gamesRouter.put("/quiz/:packId/questions/:qid", requireAuth, async (req, res) => {
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
  if (!updated) return res.status(404).json({ message: "question not found" });
  res.json(updated);
});

gamesRouter.delete("/quiz/:packId/questions/:qid", requireAuth, async (req, res) => {
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
});

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
      if (entry && typeof entry === "object" && Array.isArray((entry as any).validPasswords)) {
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
        if (aggregatedRequired === undefined && typeof cfg.requiredCorrectGroups === "number") {
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
      firstConfig = { id: "password-default", validPasswords: [], active: false };
    }

    const primary: PasswordGameConfig = {
      id: typeof firstConfig.id === "string" && firstConfig.id ? firstConfig.id : "password-default",
      validPasswords: collected,
      active: aggregatedActive || !!firstConfig.active,
      requiredCorrectGroups: aggregatedRequired !== undefined ? aggregatedRequired : firstConfig.requiredCorrectGroups,
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

gamesRouter.get("/never-have-i-ever", async (_req, res) => {
  const pack = await ensureSingleNeverHaveIEverPack();
  res.json([pack]);
});

gamesRouter.post("/never-have-i-ever", requireAuth, async (req, res) => {
  const { title, statements } = req.body || {};
  if (!title) return res.status(400).json({ message: "title required" });
  const sanitizedStatements = Array.isArray(statements) ? statements.map((s: unknown) => String(s)) : [];
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

gamesRouter.delete("/never-have-i-ever/:packId", requireAuth, async (req, res) => {
  const { packId } = req.params;
  const ok = await mutate((d) => {
    const idx = d.neverHaveIEverPacks.findIndex((p) => p.id === packId);
    if (idx === -1) return false;
    d.neverHaveIEverPacks.splice(idx, 1);
    return true;
  });
  if (!ok) return res.status(404).json({ message: "pack not found" });
  res.status(204).end();
});

gamesRouter.get("/password-game", async (_req, res) => {
  const config = await ensureSinglePasswordConfig();
  res.json(config);
});

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
      const sanitized = validPasswords.map((value) => (value != null ? String(value).trim() : "")).filter(Boolean);
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

gamesRouter.patch("/password-game", requireAuth, async (req, res) => {
  const { validPasswords, active } = req.body || {};
  await ensureSinglePasswordConfig();
  const updated = await mutate((d) => {
    const cfg = d.passwordGames[0]!;
    if (Array.isArray(validPasswords)) {
      const sanitized = validPasswords.map((value) => (value != null ? String(value).trim() : "")).filter(Boolean);
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

const passwordAttemptPaths = ["/password-game/attempt", "/password-game/:id/attempt"];
gamesRouter.post(passwordAttemptPaths, async (req, res) => {
  const { groupId, password } = req.body || {};
  if (!groupId || !password) return res.status(400).json({ message: "groupId & password required" });
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
      const required = typeof cfg.requiredCorrectGroups === "number" ? cfg.requiredCorrectGroups : Infinity;
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

const passwordAddPaths = ["/password-game/passwords", "/password-game/:id/passwords"];
gamesRouter.post(passwordAddPaths, requireAuth, async (req, res) => {
  const { password } = req.body || {};
  const value = typeof password === "string" ? password.trim() : String(password ?? "").trim();
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

const passwordRemovePaths = ["/password-game/passwords/:password", "/password-game/:id/passwords/:password"];
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

gamesRouter.get(funnyQuestionPaths, requireAuth, async (_req, res) => {
  const data = await loadData();
  res.json(data.funnyQuestions);
});

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
    if (!updated) return res.status(404).json({ message: "question not found" });
    res.json(updated);
  }
);

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

gamesRouter.get(
  funnyQuestionPaths.map((path) => `${path}/:id/answers`),
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    const data = await loadData();
    const question = data.funnyQuestions.find((q) => q.id === id);
    if (!question) return res.status(404).json({ message: "question not found" });
    const answers = data.funnyAnswers.filter((a) => a.questionId === id);
    res.json({ question, answers });
  }
);

gamesRouter.delete(
  funnyQuestionPaths.map((path) => `${path}/:id/answers/:answerId`),
  requireAuth,
  async (req, res) => {
    const { id, answerId } = req.params;
    const ok = await mutate((d) => {
      const question = d.funnyQuestions.find((q) => q.id === id);
      if (!question) return false;
      const idx = d.funnyAnswers.findIndex((a) => a.id === answerId && a.questionId === id);
      if (idx === -1) return false;
      d.funnyAnswers.splice(idx, 1);
      return true;
    });
    if (!ok) return res.status(404).json({ message: "answer not found" });
    res.status(204).end();
  }
);

// Public submission endpoint remains available
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
