import cors, { CorsOptions } from "cors";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import { gamesRouter } from "./routes.games.js";
import { groupsRouter } from "./routes.groups.js";
import { guestsRouter } from "./routes.guests.js";

const upload = multer({ dest: "uploads/" });

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

const allowedOrigins = [
  ...new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]),
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin))
      return callback(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
      return callback(null, true);
    if (origin.endsWith(".thiering.org")) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.get("/api/ashlii", (_req, res) =>
  res.json({ lovingAshliiALot: true, time: new Date().toISOString() })
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
