import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PixelRatio, StyleSheet, View, useWindowDimensions } from "react-native";

import { Button } from "@/components/game/Button";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { gameApi, type FinalScoreEntryDTO, type FinalSummaryDTO } from "@/lib/api";
import { createGameSocket } from "@/lib/ws";
import confetti from "canvas-confetti";

const FINALIST_LIMIT = 3;

//TODO: add live leaderboard
//TODO: add names of people in teams to leaderboard

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
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

export default function FinalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale ? PixelRatio.getFontScale() : 1;
  const prefersStackedCards = width < 720 || fontScale > 1.15;
  const prefersStackedLeaderboard = width < 760 || fontScale > 1.1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinalSummaryDTO | null>(null);
  const mountedRef = useRef(true);
  const groupIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 2 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 280,
          spread: 60,
          origin: { y: -1 },
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }, 600);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSummary = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const existingGroupId = groupIdRef.current ?? (await AsyncStorage.getItem("groupId"));
      if (!existingGroupId) {
        throw new Error("Keine Gruppenzuordnung gefunden. Scannt zuerst euren Partner.");
      }

      groupIdRef.current = existingGroupId;
      const response = (await gameApi.getFinalSummary(existingGroupId)) as FinalSummaryDTO;

      if (!response || typeof response !== "object") {
        throw new Error("Ergebnisse konnten nicht geladen werden. Versucht es gleich erneut.");
      }

      if (!response.group) {
        throw new Error("Wir konnten eure Gruppe nicht finden. Meldet euch beim Orga-Team.");
      }

      if (!mountedRef.current) {
        return;
      }

      setSummary(response);
      setError(null);
    } catch (err) {
      console.error("final screen load failed", err);
      if (!mountedRef.current) {
        return;
      }
      if (!silent) {
        setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen.");
      }
    } finally {
      if (!mountedRef.current) {
        return;
      }
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const socket = createGameSocket({
      onMessage: (message) => {
        if (message.type === "scoreboard-update") {
          void loadSummary({ silent: true });
        }
      },
    });

    return () => {
      socket.close();
    };
  }, [loadSummary]);

  const derived = useMemo(() => {
    const currentSummary = summary;
    const groupSummary = currentSummary?.group ?? null;

    if (!currentSummary || !groupSummary) {
      return {
        hasResult: false,
        timeLabel: "--:--",
        baseTimeLabel: "--:--",
        penaltyLabel: "+0s",
        placementLabel: "Unbekannt",
        finalist: false,
        infoText: "Wir werten eure Zeit gerade noch aus. Genießt kurz die Pause!",
        ownEntry: null as FinalScoreEntryDTO | null,
      };
    }

    const scoreboard = Array.isArray(currentSummary.scoreboard) ? currentSummary.scoreboard : [];
    const ownEntry = scoreboard.find((entry) => entry.id === groupSummary.groupId) ?? null;
    const placementIndex = ownEntry ? scoreboard.indexOf(ownEntry) : -1;

    const totalDurationMs =
      typeof groupSummary.durationMs === "number" ? groupSummary.durationMs : ownEntry?.durationMs;
    const rawDurationMs =
      typeof groupSummary.rawDurationMs === "number" ? groupSummary.rawDurationMs : ownEntry?.rawDurationMs;
    const penaltySeconds =
      typeof groupSummary.penaltySeconds === "number" ? groupSummary.penaltySeconds : ownEntry?.penaltySeconds ?? 0;

    const hasDuration = typeof totalDurationMs === "number";
    const timeLabel = typeof totalDurationMs === "number" ? formatDuration(totalDurationMs) : "--:--";
    const baseTimeLabel =
      typeof rawDurationMs === "number" ? formatDuration(rawDurationMs) : hasDuration ? timeLabel : "--:--";
    const penaltyLabel = `+${penaltySeconds.toLocaleString("de-DE")}s`;

    const placementFromSummary = groupSummary.placement;
    const placementFromScoreboard = placementIndex >= 0 ? placementIndex + 1 : undefined;
    const placement = placementFromSummary ?? placementFromScoreboard;
    const placementLabel = placement ? `${placement}. Platz` : "Unbekannt";
    const finalist = placement !== undefined && placement > 0 && placement <= FINALIST_LIMIT;

    let infoText: string;
    if (!hasDuration) {
      infoText =
        "Eure finale Zeit ist noch nicht eingetragen. Schließt die letzte Challenge ab oder meldet euch kurz beim Orga-Team, damit eure Platzierung erscheint.";
    } else if (finalist) {
      infoText =
        "Glückwunsch! Ihr gehört zu den schnellsten Teams und seid im Finale. Macht euch bereit für das Live-Trinkspiel!";
    } else if (placement) {
      infoText = `Ihr habt ${placementLabel} belegt. Für das Finale zählen die Top ${FINALIST_LIMIT}. Feiert euren Lauf und feuert die anderen an!`;
    } else {
      infoText = "Euer Platz steht gleich fest. Haltet euch bereit!";
    }

    return {
      hasResult: hasDuration,
      timeLabel,
      baseTimeLabel,
      penaltyLabel,
      placementLabel,
      finalist,
      infoText,
      ownEntry,
    };
  }, [summary]);

  const leaderboardLimit = Math.max(FINALIST_LIMIT, 5);
  const topEntries = (summary?.scoreboard?.slice(0, leaderboardLimit) ?? []) as FinalScoreEntryDTO[];
  const ownPlacement = summary?.group?.placement;
  const showOwnRow = Boolean(summary?.group && derived.ownEntry && ownPlacement && ownPlacement > leaderboardLimit);
  const ownEntry = derived.ownEntry;
  const podiumPalette = useMemo(
    () => [theme.warning, theme.info, theme.accent],
    [theme.warning, theme.info, theme.accent]
  );

  return (
    <ThemedView style={styles.screen}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image source={require("@/assets/images/papa/suprised.png")} style={styles.papaLogo} />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
            <View style={[styles.confetti, styles.confettiFour]} />
          </View>
        }>
        <ThemedView
          style={[styles.card, styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}
          testID="final-hero-card">
          <View style={styles.titleRow}>
            <View style={styles.titleTextBlock}>
              <ThemedText type="title" style={styles.titleText}>
                Finale erreicht <HelloWave />
              </ThemedText>
              <ThemedText type="subtitle" style={[styles.subtitleText, { color: theme.textSecondary }]}>
                Eure Performance im Überblick
              </ThemedText>
            </View>
            <View
              style={[
                styles.placementPill,
                {
                  backgroundColor: theme.backgroundAlt,
                  borderColor: theme.border,
                },
              ]}>
              <IconSymbol name="podium" size={18} color={theme.primary} />
              <ThemedText style={[styles.placementPillLabel, { color: theme.textMuted }]}>
                Top {FINALIST_LIMIT} gewinnen etwas!
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
            Wir haben eure Zeit mit eingerechneten Strafen ausgewertet. Schaut euch an, wie ihr im Vergleich zu den
            anderen Teams abgeschnitten habt.
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.loadingText, { color: theme.textMuted }]}>
                Ergebnisse werden geladen …
              </ThemedText>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <IconSymbol name="exclamationmark.triangle" size={24} color={theme.danger} />
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.summaryHighlight,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}>
                <View style={styles.summaryHeader}>
                  <IconSymbol name={derived.finalist ? "star.circle" : "timer"} size={28} color={theme.primary} />
                  <View style={styles.summaryHeaderText}>
                    <ThemedText type="subtitle" style={styles.summaryTitle}>
                      {summary?.group?.groupName ?? "Team"}
                    </ThemedText>
                    <ThemedText style={[styles.summaryCaption, { color: theme.textMuted }]}>
                      {summary
                        ? `Von ${summary.totalFinished} abgeschlossenen Gruppen · Insgesamt ${summary.totalGroups}`
                        : "Live aktualisierte Ergebnisse"}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.metricsRow, prefersStackedCards ? styles.metricsRowStacked : null]}>
                  <View
                    style={[
                      styles.metricCard,
                      styles.metricCardDefault,
                      { backgroundColor: theme.card },
                      prefersStackedCards ? styles.metricCardStacked : null,
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textMuted }]}>Gesamtzeit</ThemedText>
                    <ThemedText style={[styles.metricValue, { color: theme.text }]}>{derived.timeLabel}</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.metricCard,
                      styles.metricCardDefault,
                      { backgroundColor: theme.card },
                      prefersStackedCards ? styles.metricCardStacked : null,
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textMuted }]}>Reine Laufzeit</ThemedText>
                    <ThemedText style={[styles.metricValueSm, { color: theme.text }]}>
                      {derived.baseTimeLabel}
                    </ThemedText>
                    <ThemedText style={[styles.metricBadge, { color: theme.textMuted, marginBottom: 30 }]}>
                      {derived.penaltyLabel}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.metricCard,
                      derived.finalist ? styles.metricCardFinalist : styles.metricCardDefault,
                      { backgroundColor: theme.card },
                      prefersStackedCards ? styles.metricCardStacked : null,
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textMuted }]}>Platzierung</ThemedText>
                    <ThemedText
                      style={[
                        styles.metricValue,
                        {
                          color: derived.finalist ? theme.success : theme.text,
                        },
                      ]}>
                      {derived.placementLabel}
                    </ThemedText>
                    {derived.finalist ? (
                      <View
                        style={[
                          styles.finalistBadge,
                          {
                            backgroundColor: theme.primaryMuted,
                            borderColor: theme.success,
                          },
                        ]}>
                        <IconSymbol name="podium" size={14} color={theme.success} />
                        <ThemedText style={[styles.finalistBadgeLabel, { color: theme.success }]}>Im Finale</ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.messageBox,
                  {
                    borderColor: derived.finalist ? theme.success : theme.border,
                  },
                ]}>
                <IconSymbol
                  name={derived.finalist ? "star.circle" : "questionmark.circle"}
                  size={20}
                  color={derived.finalist ? theme.success : theme.textMuted}
                  style={{ marginRight: 10 }}
                />
                <ThemedText
                  style={[
                    styles.messageText,
                    {
                      color: derived.finalist ? theme.success : theme.textSecondary,
                    },
                  ]}>
                  {derived.infoText}
                </ThemedText>
              </View>

              {summary?.scoreboard?.length ? (
                <View
                  style={[
                    styles.leaderboardCard,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundAlt,
                    },
                  ]}>
                  <View style={styles.leaderboardHeader}>
                    <IconSymbol name="list.bullet" size={20} color={theme.primary} />
                    <ThemedText type="subtitle" style={styles.leaderboardTitle}>
                      Aktuelle Top {Math.min(leaderboardLimit, summary.scoreboard.length)}
                    </ThemedText>
                  </View>
                  <View style={styles.leaderboardList}>
                    {topEntries.map((entry, index) => {
                      const rank = index + 1;
                      const isTopHighlight = rank <= FINALIST_LIMIT;
                      const podiumColor = podiumPalette[rank - 1] ?? theme.primary;
                      const memberNames = entry.members?.length ? entry.members.join(", ") : null;
                      const nameDisplay = memberNames ? `${entry.name} · ${memberNames}` : entry.name;
                      const isOwnTeam = summary?.group?.groupId === entry.id;
                      const baseDurationMs =
                        typeof entry.rawDurationMs === "number" ? entry.rawDurationMs : entry.durationMs;
                      const penaltyLabel =
                        entry.penaltySeconds > 0 ? `+${entry.penaltySeconds.toLocaleString("de-DE")}s` : null;

                      return (
                        <View
                          key={entry.id}
                          style={[
                            styles.leaderboardRow,
                            prefersStackedLeaderboard ? styles.leaderboardRowStacked : null,
                            isTopHighlight ? styles.leaderboardRowPodium : null,
                            isTopHighlight
                              ? {
                                  borderColor: podiumColor,
                                  backgroundColor: `${podiumColor}33`,
                                }
                              : null,
                          ]}>
                          <View
                            style={[
                              styles.leaderboardRankBadge,
                              prefersStackedLeaderboard ? styles.leaderboardRankBadgeStacked : null,
                            ]}>
                            <ThemedText
                              style={[
                                styles.leaderboardRankLabel,
                                { color: isTopHighlight ? podiumColor : theme.text },
                              ]}>
                              {rank}.
                            </ThemedText>
                          </View>
                          <View
                            style={[
                              styles.leaderboardInfo,
                              prefersStackedLeaderboard ? styles.leaderboardInfoStacked : null,
                            ]}>
                            <ThemedText
                              style={[styles.leaderboardName, { color: isTopHighlight ? podiumColor : theme.text }]}
                              numberOfLines={2}>
                              {nameDisplay}
                            </ThemedText>
                            {entry.penaltySeconds > 0 ? null : (
                              <ThemedText style={[styles.leaderboardPenalty, { color: theme.textMuted }]}>
                                Keine Strafe
                              </ThemedText>
                            )}
                            {isOwnTeam && !isTopHighlight ? (
                              <ThemedText style={[styles.leaderboardSelfLabel, { color: theme.primary }]}>
                                Euer Team
                              </ThemedText>
                            ) : null}
                          </View>
                          <View
                            style={[
                              styles.leaderboardTiming,
                              prefersStackedLeaderboard ? styles.leaderboardTimingStacked : null,
                            ]}>
                            <ThemedText style={[styles.leaderboardBaseTime, { color: theme.text }]}>
                              {formatDuration(baseDurationMs)}
                            </ThemedText>
                            {penaltyLabel ? (
                              <ThemedText style={[styles.leaderboardPenaltyExtra, { color: theme.danger }]}>
                                {penaltyLabel}
                              </ThemedText>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}

                    {showOwnRow && ownEntry && ownPlacement ? (
                      <>
                        <View style={styles.leaderboardDivider} />
                        <View
                          style={[
                            styles.leaderboardRow,
                            styles.leaderboardRowSelf,
                            {
                              borderColor: theme.primary,
                              backgroundColor: `${theme.primary}1F`,
                            },
                          ]}>
                          <View
                            style={[
                              styles.leaderboardRankBadge,
                              prefersStackedLeaderboard ? styles.leaderboardRankBadgeStacked : null,
                            ]}>
                            <ThemedText style={[styles.leaderboardRankLabel, { color: theme.text }]}>
                              {ownPlacement}.
                            </ThemedText>
                          </View>
                          <View
                            style={[
                              styles.leaderboardInfo,
                              prefersStackedLeaderboard ? styles.leaderboardInfoStacked : null,
                            ]}>
                            <ThemedText style={[styles.leaderboardName, { color: theme.primary }]} numberOfLines={2}>
                              {ownEntry.members?.length
                                ? `${ownEntry.name} · ${ownEntry.members.join(", ")}`
                                : ownEntry.name}
                            </ThemedText>
                            {ownEntry.penaltySeconds > 0 ? null : (
                              <ThemedText style={[styles.leaderboardPenalty, { color: theme.textMuted }]}>
                                Keine Strafe
                              </ThemedText>
                            )}
                          </View>
                          <View
                            style={[
                              styles.leaderboardTiming,
                              prefersStackedLeaderboard ? styles.leaderboardTimingStacked : null,
                            ]}>
                            <ThemedText style={[styles.leaderboardBaseTime, { color: theme.text }]}>
                              {formatDuration(
                                typeof ownEntry.rawDurationMs === "number"
                                  ? ownEntry.rawDurationMs
                                  : ownEntry.durationMs
                              )}
                            </ThemedText>
                            {ownEntry.penaltySeconds > 0 ? (
                              <ThemedText style={[styles.leaderboardPenaltyExtra, { color: theme.danger }]}>
                                {`+${ownEntry.penaltySeconds.toLocaleString("de-DE")}s`}
                              </ThemedText>
                            ) : null}
                          </View>
                        </View>
                      </>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.actionsFooter}>
                <Button
                  iconText="photo.on.rectangle"
                  onPress={() => {
                    router.navigate("/gallery");
                  }}
                  style={styles.actionButton}>
                  Galerie & Uploads
                </Button>
                <Button
                  iconText="doc.text"
                  onPress={() => {
                    router.navigate("/game/questionary-answers");
                  }}
                  style={styles.actionButton}>
                  Fragebogen Antworten
                </Button>
              </View>
            </>
          )}
        </ThemedView>
      </ParallaxScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 16,
    marginHorizontal: 0,
    marginBottom: 0,
    width: "100%",
    alignSelf: "center",
    maxWidth: 720,
  },
  heroCard: {
    gap: 18,
    marginTop: 24,
  },
  titleRow: {
    flexDirection: "column",
    gap: 16,
  },
  titleTextBlock: {
    gap: 6,
  },
  titleText: {
    flexWrap: "wrap",
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: "600",
  },
  leadText: {
    fontSize: 16,
    lineHeight: 22,
  },
  placementPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  placementPillLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 16,
  },
  errorState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  summaryHighlight: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryHeaderText: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryCaption: {
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metricCardDefault: {
    borderColor: "rgba(148,163,184,0.35)",
  },
  metricCardFinalist: {
    borderColor: "rgba(34,197,94,0.35)",
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  metricValueSm: {
    fontSize: 22,
    fontWeight: "700",
  },
  metricBadge: {
    fontSize: 14,
    fontWeight: "600",
  },
  finalistBadge: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  finalistBadgeLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  messageBox: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    backgroundColor: "rgba(148,163,184,0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  metricsRowStacked: {
    flexDirection: "column",
    gap: 16,
  },
  metricCardStacked: {
    width: "100%",
  },
  actionsFooter: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    width: "100%",
  },
  leaderboardCard: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 16,
  },
  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  leaderboardList: {
    gap: 10,
  },
  leaderboardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.35)",
    marginVertical: 4,
    borderRadius: 999,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.25)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  leaderboardRowStacked: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  leaderboardRowPodium: {
    borderWidth: 1.4,
  },
  leaderboardRowSelf: {
    borderWidth: 1.4,
  },
  leaderboardRankBadge: {
    width: 36,
    alignItems: "flex-start",
  },
  leaderboardRankBadgeStacked: {
    width: "100%",
  },
  leaderboardRankLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  leaderboardInfo: {
    flex: 1,
    gap: 4,
  },
  leaderboardInfoStacked: {
    width: "100%",
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: "700",
  },
  leaderboardPenalty: {
    fontSize: 13,
    fontWeight: "500",
  },
  leaderboardSelfLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  leaderboardTiming: {
    alignItems: "flex-end",
    gap: 2,
  },
  leaderboardTimingStacked: {
    alignItems: "flex-start",
    width: "100%",
  },
  leaderboardBaseTime: {
    fontSize: 18,
    fontWeight: "700",
  },
  leaderboardPenaltyExtra: {
    fontSize: 14,
    fontWeight: "700",
  },
  partyHeader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  partyGlow: {
    position: "absolute",
    borderRadius: 160,
    width: 260,
    height: 260,
    opacity: 0.55,
  },
  partyGlowPrimary: {
    backgroundColor: "rgba(236, 72, 153, 0.45)",
    left: 0,
  },
  partyGlowSecondary: {
    backgroundColor: "rgba(59, 130, 246, 0.35)",
    width: 200,
    height: 200,
    borderRadius: 140,
    left: 0,
  },
  partyCrown: {
    width: 200,
    height: 150,
    marginTop: 10,
  },
  confetti: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
  },
  confettiOne: {
    height: 36,
    backgroundColor: "#F97316",
    top: 28,
    left: 130,
    transform: [{ rotate: "18deg" }],
  },
  confettiTwo: {
    height: 28,
    backgroundColor: "#6366F1",
    top: 24,
    right: 60,
    transform: [{ rotate: "-12deg" }],
  },
  confettiThree: {
    height: 22,
    backgroundColor: "#22C55E",
    bottom: 26,
    left: 190,
    transform: [{ rotate: "-28deg" }],
  },
  confettiFour: {
    height: 32,
    backgroundColor: "#FACC15",
    bottom: 18,
    right: 80,
    transform: [{ rotate: "24deg" }],
  },
  papaLogo: {
    height: 200,
    width: 240,
    bottom: 0,
    left: 0,
    top: 0,
    right: 0,
    position: "absolute",
  },
});
