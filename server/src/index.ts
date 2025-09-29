import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import { gamesRouter } from "./routes.games.js";
import { groupsRouter } from "./routes.groups.js";
import { guestsRouter } from "./routes.guests.js";

const upload = multer({ dest: "uploads/" });

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.get("/api/ashlii", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.use("/api/guests", guestsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/games", gamesRouter);

// Add comment so server restarts on change
// Simple image upload (returns URL). Use field name 'image'.
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "file required" });
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// Error handler

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "internal error", error: err?.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
