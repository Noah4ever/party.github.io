import cors, { CorsOptions } from "cors";
import express, { NextFunction, Request, Response } from "express";
import { promises as fs } from "fs";
import { createServer } from "http";
import multer from "multer";
import { nanoid } from "nanoid";
import { extname } from "path";
import { authRouter } from "./auth.js";
import { mutate } from "./dataStore.js";
import { adminRouter } from "./routes.admin.js";
import { gamesRouter } from "./routes.games.js";
import { groupsRouter } from "./routes.groups.js";
import { guestsRouter } from "./routes.guests.js";
import "./setupEnv.js";
import { initWebsocket } from "./websocket.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname || "").toLowerCase() || ".jpg";
    const rawGuest = typeof req.body?.guestId === "string" ? req.body.guestId : "guest";
    const guestSlug =
      rawGuest
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 32) || "guest";
    const filename = `${Date.now()}-${guestSlug}-${nanoid(6)}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 7 * 1024 * 1024, // ~7MB
  },
});

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:19000",
  "http://localhost:19001",
  "http://localhost:19002",
  "http://localhost:19006",
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:5000",
  "https://party.github.io",
  "https://www.party.github.io",
];

const envOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins])];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return callback(null, true);
    if (origin.endsWith(".thiering.org")) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/ashlii", (_req, res) => res.json({ lovingAshliiALot: true, time: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/guests", guestsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/games", gamesRouter);

// Add comment so server restarts on change
// Simple image upload (returns URL). Use field name 'image'.
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "image required" });
    }

    if (!req.file.mimetype?.startsWith?.("image/")) {
      await fs.unlink(req.file.path).catch(() => undefined);
      return res.status(415).json({ message: "only image uploads allowed" });
    }

    const { guestId, groupId, challengeId } = req.body || {};
    const uploadedAt = new Date().toISOString();
    const url = `/uploads/${req.file.filename}`;
    const absoluteUrl = `${req.protocol}://${req.get("host")}${url}`;

    if (groupId && typeof groupId === "string") {
      await mutate((data) => {
        const group = data.groups.find((g) => g.id === groupId);
        if (group) {
          if (!group.progress) {
            group.progress = { completedGames: [] };
          }
          group.progress.selfieUrl = url;
          group.progress.selfieUploadedAt = uploadedAt;
          if (challengeId && typeof challengeId === "string") {
            group.progress.lastSelfieChallenge = challengeId;
          }
        }
      });
    }

    res.status(201).json({
      url,
      absoluteUrl,
      filename: req.file.filename,
      guestId: typeof guestId === "string" ? guestId : null,
      groupId: typeof groupId === "string" ? groupId : null,
      challengeId: typeof challengeId === "string" ? challengeId : null,
      uploadedAt,
    });
  } catch (error) {
    console.error("upload error", error);
    res.status(500).json({ message: "upload failed" });
  }
});

// Error handler

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "internal error", error: err?.message });
});

const PORT = process.env.PORT || 5000;
const server = createServer(app);
initWebsocket(server);

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
