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
    fileSize: 500 * 1024 * 1024, // ~500MB to allow large videos
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

const isPrivateNetworkOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return (
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host === "0.0.0.0"
    );
  } catch {
    return false;
  }
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return callback(null, true);
    if (isPrivateNetworkOrigin(origin)) return callback(null, true);
    if (origin.endsWith(".thiering.org")) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/ashlii", (_req, res) => res.json({ lovingAshliiALot: true, time: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/guests", guestsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/games", gamesRouter);

// Chunked upload support for large files
const chunkedUploads = new Map<
  string,
  {
    chunks: Buffer[];
    metadata: any;
    receivedSize: number;
    totalSize: number;
  }
>();

// Initialize chunked upload
app.post("/api/upload/init", express.json(), async (req, res) => {
  try {
    const { fileName, fileSize, mimeType, totalChunks } = req.body;
    if (!fileName || !fileSize || !totalChunks) {
      return res.status(400).json({ message: "fileName, fileSize, and totalChunks required" });
    }

    const uploadId = nanoid();
    chunkedUploads.set(uploadId, {
      chunks: [],
      metadata: { fileName, fileSize, mimeType, totalChunks },
      receivedSize: 0,
      totalSize: fileSize,
    });

    res.status(201).json({ uploadId });
  } catch (error) {
    console.error("chunked upload init error", error);
    res.status(500).json({ message: "init failed" });
  }
});

// Upload chunk
app.post("/api/upload/chunk", express.raw({ limit: "10mb", type: "application/octet-stream" }), async (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.query;
    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ message: "uploadId and chunkIndex required" });
    }

    const upload = chunkedUploads.get(uploadId as string);
    if (!upload) {
      return res.status(404).json({ message: "upload not found" });
    }

    const chunkIdx = parseInt(chunkIndex as string, 10);
    upload.chunks[chunkIdx] = Buffer.from(req.body);
    upload.receivedSize += req.body.length;

    res.status(200).json({
      received: chunkIdx,
      progress: (upload.receivedSize / upload.totalSize) * 100,
    });
  } catch (error) {
    console.error("chunked upload chunk error", error);
    res.status(500).json({ message: "chunk upload failed" });
  }
});

// Finalize chunked upload
app.post("/api/upload/finalize", express.json(), async (req, res) => {
  try {
    const { uploadId, guestId, groupId, challengeId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ message: "uploadId required" });
    }

    const upload = chunkedUploads.get(uploadId);
    if (!upload) {
      return res.status(404).json({ message: "upload not found" });
    }

    // Combine all chunks
    const completeBuffer = Buffer.concat(upload.chunks);
    const { fileName } = upload.metadata;

    // Save to disk
    const ext = extname(fileName || "").toLowerCase() || ".jpg";
    const segments = [Date.now().toString()];

    const normalizeSegment = (value: unknown) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const cleaned = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 32);
      return cleaned || null;
    };

    const groupSegment = normalizeSegment(groupId);
    if (groupSegment) segments.push(`grp-${groupSegment}`);

    const guestSegment = normalizeSegment(guestId);
    if (guestSegment) segments.push(`guest-${guestSegment}`);

    segments.push(nanoid(6));
    const finalFileName = `${segments.join("-")}${ext}`;
    const filePath = `uploads/${finalFileName}`;

    await fs.writeFile(filePath, completeBuffer);

    // Clean up
    chunkedUploads.delete(uploadId);

    // Update data store
    const uploadedAt = new Date().toISOString();
    const url = `/uploads/${finalFileName}`;
    const absoluteUrl = `${req.protocol}://${req.get("host")}${url}`;

    const normalizeId = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
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
      filename: finalFileName,
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
    console.error("chunked upload finalize error", error);
    res.status(500).json({ message: "finalize failed" });
  }
});

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
