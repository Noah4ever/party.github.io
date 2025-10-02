import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import { Guest } from "./types.js";

export const guestsRouter = Router();

// GET /api/guests
/**
 * GET /api/guests
 *
 * Returns every registered guest. No authentication required because the public app
 * needs read-only access. Used by admin dashboards as well.
 *
 * Response: Guest[]
 */
guestsRouter.get("/", async (_req, res) => {
  const data = await loadData();
  res.json(data.guests);
});

// POST /api/guests
// body: { name, clue1?, clue2? }
/**
 * POST /api/guests
 *
 * Creates a new guest record. Requires admin authentication. Clues are optional and can be
 * provided later. On success the newly created guest is returned.
 *
 * Body: { name: string; clue1?: string; clue2?: string }
 * Response: Guest (201 Created)
 */
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

/**
 * PUT /api/guests/:id
 *
 * Updates an existing guest. Requires admin authentication. Only fields supplied in the
 * payload are overwritten. Returns 404 if the guest does not exist.
 *
 * Body: { name?: string; clue1?: string; clue2?: string }
 * Response: Guest
 */
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

/**
 * DELETE /api/guests/:id
 *
 * Deletes a guest by id and removes references from any groups. Requires admin authentication.
 * Returns 204 on success or 404 if the guest cannot be found.
 */
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
