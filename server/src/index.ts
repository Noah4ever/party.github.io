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

    const normalizeSegment = (value: unknown) => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const cleaned = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 32);
      return cleaned || null;
    };

    const segments = [Date.now().toString()];
    const groupSegment = normalizeSegment(req.body?.groupId);
    if (groupSegment) {
      segments.push(`grp-${groupSegment}`);
    }
    const guestSegment = normalizeSegment(req.body?.guestId);
    if (guestSegment) {
      segments.push(`guest-${guestSegment}`);
    }

    segments.push(nanoid(6));

    const filename = `${segments.join("-")}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // ~50MB to allow short videos
  },
});

const uploadMiddleware = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "media", maxCount: 1 },
]);

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
// Simple media upload (returns URL). Accepts image or video via 'image' or 'media' field name.
app.post("/api/upload", uploadMiddleware, async (req, res) => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const file: Express.Multer.File | undefined =
      files?.media?.[0] ??
      files?.image?.[0] ??
      (Array.isArray(req.file) ? req.file[0] : (req.file as Express.Multer.File | undefined));

    if (!file) {
      return res.status(400).json({ message: "media required" });
    }

    const isSupported = file.mimetype?.startsWith?.("image/") || file.mimetype?.startsWith?.("video/");
    if (!isSupported) {
      await fs.unlink(file.path).catch(() => undefined);
      return res.status(415).json({ message: "only image or video uploads allowed" });
    }

    const { guestId, groupId, challengeId } = req.body || {};
    const uploadedAt = new Date().toISOString();
    const url = `/uploads/${file.filename}`;
    const absoluteUrl = `${req.protocol}://${req.get("host")}${url}`;

    const normalizeId = (value: unknown): string | null => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const normalizedGuestId = normalizeId(guestId);
    const normalizedGroupId = normalizeId(groupId);
    const normalizedChallengeId = normalizeId(challengeId);

    if (normalizedGroupId) {
      await mutate((data) => {
        const group = data.groups.find((g) => g.id === normalizedGroupId);
        if (group) {
          if (!group.progress) {
            group.progress = { completedGames: [] };
          }
          group.progress.selfieUrl = url;
          group.progress.selfieUploadedAt = uploadedAt;
          if (normalizedChallengeId) {
            group.progress.lastSelfieChallenge = normalizedChallengeId;
          }
        }
      });
    }

    const normalizedUpload = {
      filename: file.filename,
      guestId: normalizedGuestId,
      groupId: normalizedGroupId,
      challengeId: normalizedChallengeId,
      uploadedAt,
    } as const;

    await mutate((data) => {
      if (!Array.isArray(data.uploads)) {
        data.uploads = [];
      }
      data.uploads.push({ ...normalizedUpload });
    });

    res.status(201).json({
      url,
      absoluteUrl,
      ...normalizedUpload,
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
