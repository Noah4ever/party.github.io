import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import {
  NeverHaveIEverPack,
  PasswordGameConfig,
  QuizPack,
  QuizQuestion,
} from "./types.js";

export const gamesRouter = Router();

// NEVER HAVE I EVER PACKS
// GET all packs
// POST create { title, statements[] }
// PUT update
// DELETE remove

gamesRouter.get("/never-have-i-ever", async (_req, res) => {
  const data = await loadData();
  res.json(data.neverHaveIEverPacks);
});

gamesRouter.post("/never-have-i-ever", requireAuth, async (req, res) => {
  const { title, statements } = req.body || {};
  if (!title) return res.status(400).json({ message: "title required" });
  if (!Array.isArray(statements))
    return res.status(400).json({ message: "statements array required" });
  const pack: NeverHaveIEverPack = { id: nanoid(8), title, statements };
  await mutate((d) => {
    d.neverHaveIEverPacks.push(pack);
    return pack;
  });
  res.status(201).json(pack);
});

gamesRouter.put("/never-have-i-ever/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, statements } = req.body || {};
  const updated = await mutate((d) => {
    const pack = d.neverHaveIEverPacks.find((p) => p.id === id);
    if (!pack) return null;
    if (title !== undefined) pack.title = title;
    if (statements) pack.statements = statements;
    return pack;
  });
  if (!updated) return res.status(404).json({ message: "pack not found" });
  res.json(updated);
});

gamesRouter.delete("/never-have-i-ever/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const ok = await mutate((d) => {
    const idx = d.neverHaveIEverPacks.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    d.neverHaveIEverPacks.splice(idx, 1);
    return true;
  });
  if (!ok) return res.status(404).json({ message: "pack not found" });
  res.status(204).end();
});

// QUIZ PACKS

gamesRouter.get("/quiz", async (_req, res) => {
  const data = await loadData();
  res.json(data.quizPacks);
});

gamesRouter.post("/quiz", requireAuth, async (req, res) => {
  const { title, questions } = req.body || {};
  if (!title) return res.status(400).json({ message: "title required" });
  const pack: QuizPack = { id: nanoid(8), title, questions: [] };
  if (Array.isArray(questions)) pack.questions = questions;
  await mutate((d) => {
    d.quizPacks.push(pack);
    return pack;
  });
  res.status(201).json(pack);
});

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

gamesRouter.put(
  "/quiz/:packId/questions/:qid",
  requireAuth,
  async (req, res) => {
    const { packId, qid } = req.params;
    const { question, answers, difficulty, imageUrl } = req.body || {};
    const updated = await mutate((d) => {
      const pack = d.quizPacks.find((p) => p.id === packId);
      if (!pack) return null;
      const q = pack.questions.find((q) => q.id === qid);
      if (!q) return null;
      if (question !== undefined) q.question = question;
      if (answers) q.answers = answers;
      if (difficulty !== undefined) q.difficulty = difficulty;
      if (imageUrl !== undefined) q.imageUrl = imageUrl;
      return q;
    });
    if (!updated)
      return res.status(404).json({ message: "question not found" });
    res.json(updated);
  }
);

gamesRouter.delete(
  "/quiz/:packId/questions/:qid",
  requireAuth,
  async (req, res) => {
    const { packId, qid } = req.params;
    const ok = await mutate((d) => {
      const pack = d.quizPacks.find((p) => p.id === packId);
      if (!pack) return false;
      const idx = pack.questions.findIndex((q) => q.id === qid);
      if (idx === -1) return false;
      pack.questions.splice(idx, 1);
      return true;
    });
    if (!ok) return res.status(404).json({ message: "question not found" });
    res.status(204).end();
  }
);

// PASSWORD GAME CONFIG

gamesRouter.get("/password-game", async (_req, res) => {
  const data = await loadData();
  res.json(data.passwordGames);
});

gamesRouter.post("/password-game", requireAuth, async (req, res) => {
  const { validPasswords, requiredCorrectGroups = 4 } = req.body || {};
  if (!Array.isArray(validPasswords) || validPasswords.length === 0)
    return res.status(400).json({ message: "validPasswords required" });
  const config: PasswordGameConfig = {
    id: nanoid(8),
    validPasswords,
    requiredCorrectGroups,
    active: false,
  };
  await mutate((d) => {
    d.passwordGames.push(config);
    return config;
  });
  res.status(201).json(config);
});

gamesRouter.post("/password-game/:id/start", requireAuth, async (req, res) => {
  const { id } = req.params;
  const updated = await mutate((d) => {
    const cfg = d.passwordGames.find((p) => p.id === id);
    if (!cfg) return null;
    cfg.active = true;
    cfg.startedAt = new Date().toISOString();
    return cfg;
  });
  if (!updated) return res.status(404).json({ message: "config not found" });
  res.json(updated);
});

gamesRouter.post("/password-game/:id/attempt", async (req, res) => {
  const { id } = req.params;
  const { groupId, password } = req.body || {};
  if (!groupId || !password)
    return res.status(400).json({ message: "groupId & password required" });
  const result = await mutate((d) => {
    const cfg = d.passwordGames.find((p) => p.id === id && p.active);
    if (!cfg) return { error: "not active" };
    const group = d.groups.find((g) => g.id === groupId);
    if (!group) return { error: "group not found" };
    group.progress.attempts = (group.progress.attempts || 0) + 1;
    const correct = cfg.validPasswords.includes(password);
    if (correct) {
      group.passwordSolved = true;
      group.finishedAt = new Date().toISOString();
      const solved = d.groups.filter((g) => g.passwordSolved).length;
      if (solved >= cfg.requiredCorrectGroups && !cfg.endedAt) {
        cfg.endedAt = new Date().toISOString();
        cfg.active = false;
      }
    }
    return { correct, solved: group.passwordSolved, ended: !!cfg.endedAt };
  });
  if ("error" in result) return res.status(400).json({ message: result.error });
  res.json(result);
});
