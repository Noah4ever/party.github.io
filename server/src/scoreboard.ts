import { Group, Guest } from "./types.js";

export type FinalScoreboardEntry = {
  id: string;
  name: string;
  members: string[];
  durationMs: number;
  rawDurationMs: number;
  penaltySeconds: number;
  startedAt?: string;
  finishedAt?: string;
};

export const parseIsoTime = (value?: string | null): number | undefined => {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
};

export const computeGroupScore = (
  group: Group,
  guests: Guest[],
  fallbackStartMs?: number
): FinalScoreboardEntry | null => {
  const startedAtMs = fallbackStartMs ?? parseIsoTime(group.startedAt);
  const finishedAtMs = parseIsoTime(group.finishedAt);
  if (startedAtMs === undefined || finishedAtMs === undefined) {
    return null;
  }
  const penaltySeconds = Math.max(0, group.progress?.timePenaltySeconds ?? 0);
  const rawDurationMs = Math.max(0, finishedAtMs - startedAtMs);
  const members = group.guestIds
    .map((id) => guests.find((guest) => guest.id === id)?.name)
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0);
  return {
    id: group.id,
    name: group.name,
    members,
    durationMs: rawDurationMs + penaltySeconds * 1000,
    rawDurationMs,
    penaltySeconds,
    startedAt: group.startedAt,
    finishedAt: group.finishedAt,
  };
};

export const compareScoreEntries = (a: FinalScoreboardEntry, b: FinalScoreboardEntry): number => {
  if (a.durationMs !== b.durationMs) {
    return a.durationMs - b.durationMs;
  }
  const aFinished = parseIsoTime(a.finishedAt);
  const bFinished = parseIsoTime(b.finishedAt);
  if (aFinished !== undefined && bFinished !== undefined) {
    return aFinished - bFinished;
  }
  return 0;
};

export const buildScoreboard = (groups: Group[], guests: Guest[], fallbackStartMs?: number): FinalScoreboardEntry[] =>
  groups
    .map((group) => computeGroupScore(group, guests, fallbackStartMs))
    .filter((entry): entry is FinalScoreboardEntry => entry !== null)
    .sort(compareScoreEntries);
