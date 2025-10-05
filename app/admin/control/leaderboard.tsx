import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLeaderboardDTO, AdminLeaderboardEntryDTO, ApiError, adminApi } from "@/lib/api";

const FINALIST_LIMIT = 4;

function formatDuration(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--:--";
  }
  const totalSeconds = Math.max(0, Math.round(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatPenalty(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  return `+${safeSeconds.toLocaleString("de-DE")}s penalty`;
}

function LeaderboardSection({
  title,
  entries,
  highlight,
}: {
  title: string;
  entries: AdminLeaderboardEntryDTO[];
  highlight?: boolean;
}) {
  const theme = useTheme();

  if (entries.length === 0) {
    return null;
  }

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        <IconSymbol name="podium" size={20} color={theme.primary} />
        <ThemedText type="subtitle" style={[styles.cardTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
      </View>
      <View style={{ gap: 12 }}>
        {entries.map((entry) => (
          <View
            key={entry.id}
            style={[
              styles.entryRow,
              {
                borderColor: theme.border,
                backgroundColor: highlight ? theme.backgroundAlt : theme.surface,
              },
            ]}>
            <View
              style={[
                styles.rankBadge,
                {
                  backgroundColor: highlight ? theme.primary : theme.overlay,
                },
              ]}>
              <ThemedText
                style={[
                  styles.rankText,
                  { color: highlight ? theme.background : theme.text },
                ]}>{`#${entry.placement}`}</ThemedText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.entryName, { color: theme.text }]} numberOfLines={1}>
                {entry.name}
              </ThemedText>
              <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                {formatDuration(entry.durationMs)} · Base {formatDuration(entry.rawDurationMs)} ·{" "}
                {formatPenalty(entry.penaltySeconds)}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();

  const [data, setData] = useState<AdminLeaderboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setError(null);
    try {
      const ok = await ensureSession();
      if (!ok) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const response = (await adminApi.getLeaderboard()) as AdminLeaderboardDTO;
      setData(response);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load leaderboard";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ensureSession]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadLeaderboard();
    }, [loadLeaderboard])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const summaryStats = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Teams finished",
        value: `${data.totalFinished} / ${data.totalGroups}`,
      },
      {
        label: "Finalist slots",
        value: FINALIST_LIMIT.toString(),
      },
    ];
  }, [data]);

  const hasContent = Boolean(data && (data.top.length > 0 || data.others.length > 0 || data.unfinished.length > 0));

  return (
    <>
      <Stack.Screen options={{ title: "Leaderboard" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        {loading && !refreshing ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: 12, color: theme.textMuted }}>Loading leaderboard…</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <IconSymbol name="exclamationmark.triangle" size={28} color={theme.danger} />
            <ThemedText style={{ marginTop: 12, color: theme.danger, textAlign: "center" }}>{error}</ThemedText>
          </View>
        ) : hasContent ? (
          <>
            <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <IconSymbol name="podium" size={20} color={theme.primary} />
                <ThemedText type="subtitle" style={[styles.cardTitle, { color: theme.text }]}>
                  Overview
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                {summaryStats.map((stat) => (
                  <View key={stat.label} style={styles.summaryItem}>
                    <ThemedText style={[styles.summaryValue, { color: theme.text }]}>{stat.value}</ThemedText>
                    <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>{stat.label}</ThemedText>
                  </View>
                ))}
              </View>
            </ThemedView>

            <LeaderboardSection title="Top finalists" entries={data!.top} highlight />
            <LeaderboardSection title="Remaining finishers" entries={data!.others} />

            {data!.unfinished.length > 0 ? (
              <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="timer" size={20} color={theme.warning} />
                  <ThemedText type="subtitle" style={[styles.cardTitle, { color: theme.text }]}>
                    Still on the course
                  </ThemedText>
                </View>
                <View style={{ gap: 8 }}>
                  {data!.unfinished.map((group) => (
                    <View key={group.id} style={styles.unfinishedRow}>
                      <IconSymbol name="chevron.right" size={16} color={theme.textMuted} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ color: theme.text }}>{group.name}</ThemedText>
                        <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                          {group.startedAt ? new Date(group.startedAt).toLocaleTimeString() : "Not started"}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              </ThemedView>
            ) : null}
          </>
        ) : (
          <View style={styles.centerContent}>
            <IconSymbol name="podium" size={28} color={theme.icon} />
            <ThemedText style={{ marginTop: 12, color: theme.textMuted, textAlign: "center" }}>
              No results yet. Finish a challenge to populate the leaderboard.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  summaryItem: {
    flexShrink: 0,
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 16,
    fontWeight: "700",
  },
  entryName: {
    fontSize: 16,
    fontWeight: "600",
  },
  unfinishedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
});
