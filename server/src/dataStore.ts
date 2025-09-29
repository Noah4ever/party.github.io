import { promises as fs } from "fs";
import path from "path";
import { DataShape, DEFAULT_DATA } from "./types.js";

const DATA_FILE = path.resolve(process.cwd(), "server-data.json");
let memoryCache: DataShape | null = null;
let writing = false;
let queued = false;

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8");
  }
}

export async function loadData(): Promise<DataShape> {
  if (memoryCache) return memoryCache;
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  memoryCache = { ...DEFAULT_DATA, ...(JSON.parse(raw) as DataShape) };
  return memoryCache;
}

export async function saveData(data: DataShape) {
  memoryCache = data;
  if (writing) {
    queued = true;
    return;
  }
  writing = true;
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } finally {
    writing = false;
    if (queued) {
      queued = false;
      saveData(memoryCache!);
    }
  }
}

export async function mutate<T>(fn: (data: DataShape) => T | Promise<T>): Promise<T> {
  const data = await loadData();
  const result = await fn(data);
  await saveData(data);
  return result;
}
