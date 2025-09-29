import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "./auth.js";
import { loadData, mutate } from "./dataStore.js";
import { Group } from "./types.js";

export const groupsRouter = Router();

// GET groups with expanded guests optionally
// /api/groups?expand=1
// returns groups + guests inline when expand

groupsRouter.get("/", async (req, res) => {
  const data = await loadData();
  if (req.query.expand) {
    const result = data.groups.map((g) => ({
      ...g,
      guests: g.guestIds
        .map((id) => data.guests.find((gs) => gs.id === id))
        .filter(Boolean),
    }));
    return res.json(result);
  }
  res.json(data.groups);
});

// POST create group { name, guestIds?: string[] }

groupsRouter.post("/", requireAuth, async (req, res) => {
  const { name, guestIds = [] } = req.body || {};
  if (!name) return res.status(400).json({ message: "name required" });
  if (guestIds.length > 2)
    return res.status(400).json({ message: "guestIds max length 2" });
  const group: Group = {
    id: nanoid(8),
    name,
    guestIds: [...guestIds],
    progress: { completedGames: [], attempts: 0 },
  };
  await mutate((d) => {
    d.groups.push(group);
    // attach group to guests
    group.guestIds.forEach((gid) => {
      const g = d.guests.find((gs) => gs.id === gid);
      if (g) g.groupId = group.id;
    });
    return group;
  });
  res.status(201).json(group);
});

// PUT update group (rename or change members)

groupsRouter.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, guestIds } = req.body || {};
  const updated = await mutate((d) => {
    const group = d.groups.find((g) => g.id === id);
    if (!group) return null;
    if (name !== undefined) group.name = name;
    if (guestIds) {
      if (!Array.isArray(guestIds) || guestIds.length > 2) return null;
      // detach old
      group.guestIds.forEach((gid) => {
        const g = d.guests.find((gs) => gs.id === gid);
        if (g) delete g.groupId;
      });
      group.guestIds = [...guestIds];
      group.guestIds.forEach((gid) => {
        const g = d.guests.find((gs) => gs.id === gid);
        if (g) g.groupId = group.id;
      });
    }
    return group;
  });
  if (!updated) return res.status(404).json({ message: "group not found" });
  res.json(updated);
});

// DELETE group

groupsRouter.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const ok = await mutate((d) => {
    const idx = d.groups.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    const [group] = d.groups.splice(idx, 1);
    group.guestIds.forEach((gid) => {
      const g = d.guests.find((gs) => gs.id === gid);
      if (g) delete g.groupId;
    });
    return true;
  });
  if (!ok) return res.status(404).json({ message: "group not found" });
  res.status(204).end();
});
