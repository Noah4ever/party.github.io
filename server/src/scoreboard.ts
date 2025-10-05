import { Group } from "./types.js";

export type FinalScoreboardEntry = {
  id: string;
  name: string;
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

export const computeGroupScore = (group: Group, fallbackStartMs?: number): FinalScoreboardEntry | null => {
  const startedAtMs = fallbackStartMs ?? parseIsoTime(group.startedAt);
  const finishedAtMs = parseIsoTime(group.finishedAt);
  if (startedAtMs === undefined || finishedAtMs === undefined) {
    return null;
  }
  const penaltySeconds = Math.max(0, group.progress?.timePenaltySeconds ?? 0);
  const rawDurationMs = Math.max(0, finishedAtMs - startedAtMs);
  return {
    id: group.id,
    name: group.name,
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

export const buildScoreboard = (groups: Group[], fallbackStartMs?: number): FinalScoreboardEntry[] =>
  groups
    .map((group) => computeGroupScore(group, fallbackStartMs))
    .filter((entry): entry is FinalScoreboardEntry => entry !== null)
    .sort(compareScoreEntries);
