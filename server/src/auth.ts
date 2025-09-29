import crypto from "crypto";
import { RequestHandler, Router } from "express";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ashlii";
const TOKEN_TTL_MS =
  parseInt(process.env.ADMIN_TOKEN_TTL || "", 10) || 1000 * 60 * 60 * 12; // 12 hours
const TOKEN_BYTE_LENGTH = 48;

interface TokenRecord {
  expiresAt: number;
}

const tokens = new Map<string, TokenRecord>();

function cleanupExpired() {
  const now = Date.now();
  for (const [token, record] of tokens.entries()) {
    if (record.expiresAt <= now) {
      tokens.delete(token);
    }
  }
}

function issueToken() {
  cleanupExpired();
  const token = crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, { expiresAt });
  return { token, expiresAt };
}

function verifyToken(token: string) {
  cleanupExpired();
  const record = tokens.get(token);
  if (!record) return false;
  if (record.expiresAt <= Date.now()) {
    tokens.delete(token);
    return false;
  }
  return true;
}

function revokeToken(token: string) {
  tokens.delete(token);
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || "";
  if (typeof header !== "string") {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : header.trim();
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as any).adminToken = token;
  next();
};

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ message: "password required" });
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "invalid credentials" });
  }
  const { token, expiresAt } = issueToken();
  res.json({ token, expiresAt, expiresIn: TOKEN_TTL_MS });
});

authRouter.post("/logout", requireAuth, (req, res) => {
  const header = req.headers.authorization || "";
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : undefined;
  if (token) revokeToken(token);
  res.status(204).end();
});
