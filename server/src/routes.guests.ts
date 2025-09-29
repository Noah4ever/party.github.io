import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import { Guest } from "./types.js";

export const guestsRouter = Router();

// GET /api/guests
guestsRouter.get("/", async (_req, res) => {
  const data = await loadData();
  res.json(data.guests);
});

// POST /api/guests
// body: { name, clue1?, clue2? }
guestsRouter.post("/", requireAuth, async (req, res) => {
  const { name, clue1, clue2 } = req.body || {};
  if (!name) return res.status(400).json({ message: "name required" });
  const guest: Guest = { id: nanoid(8), name, clue1, clue2 };
  await mutate((d) => {
    d.guests.push(guest);
    return guest;
  });
  res.status(201).json(guest);
});

// PUT /api/guests/:id
// body: { name?, clue1?, clue2? }

guestsRouter.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, clue1, clue2 } = req.body || {};
  const updated = await mutate((d) => {
    const g = d.guests.find((g) => g.id === id);
    if (!g) return null;
    if (name !== undefined) g.name = name;
    if (clue1 !== undefined) g.clue1 = clue1;
    if (clue2 !== undefined) g.clue2 = clue2;
    return g;
  });
  if (!updated) return res.status(404).json({ message: "guest not found" });
  res.json(updated);
});

// DELETE /api/guests/:id - remove guest and detach from group

guestsRouter.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const removed = await mutate((d) => {
    const idx = d.guests.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    const [guest] = d.guests.splice(idx, 1);
    if (guest.groupId) {
      const group = d.groups.find((g) => g.id === guest.groupId);
      if (group) {
        group.guestIds = group.guestIds.filter((gid) => gid !== guest.id);
      }
    }
    return true;
  });
  if (!removed) return res.status(404).json({ message: "guest not found" });
  res.status(204).end();
});
