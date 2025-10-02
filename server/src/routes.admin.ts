import { Router } from "express";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import { DataShape } from "./types.js";

export const adminRouter = Router();

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
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
  };
}

adminRouter.get("/data", requireAuth, async (_req, res) => {
  const data = await loadData();
  res.json(data);
});

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
    return true;
  });

  res.json({ success: true, importedAt: new Date().toISOString() });
});

adminRouter.post("/clear-data", requireAuth, async (_req, res) => {
  await mutate((d) => {
    d.guests = [];
    d.groups = [];
    d.neverHaveIEverPacks = [];
    d.quizPacks = [];
    d.passwordGames = [];
    d.funnyQuestions = [];
    d.funnyAnswers = [];
    return true;
  });

  res.json({ success: true, clearedAt: new Date().toISOString() });
});
