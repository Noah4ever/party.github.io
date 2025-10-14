import { loadData } from "./dataStore.js";
import { buildScoreboard, parseIsoTime } from "./scoreboard.js";
import { broadcastScoreboardUpdate } from "./websocket.js";

export async function broadcastLatestScoreboard(): Promise<void> {
  try {
    const data = await loadData();
    const groups = data.groups ?? [];
    const guests = data.guests ?? [];
    const fallbackGlobalMs = parseIsoTime(data.gameState?.startedAt) ?? undefined;

    const scoreboard = buildScoreboard(groups, guests, fallbackGlobalMs);
    broadcastScoreboardUpdate({
      scoreboard,
      totalFinished: scoreboard.length,
      totalGroups: groups.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("broadcastLatestScoreboard failed", error);
  }
}
