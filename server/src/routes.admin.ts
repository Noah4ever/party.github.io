import { Router } from "express";
import { requireAuth } from "./auth.js";
import { mutate } from "./dataStore.js";

export const adminRouter = Router();

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
