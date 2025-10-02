import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, GameStateDTO, adminApi } from "@/lib/api";

const isGameState = (value: unknown): value is GameStateDTO =>
  !!value && typeof value === "object" && "started" in (value as Record<string, unknown>);

const isGameStateResponse = (
  value: unknown
): value is {
  success: boolean;
  state: GameStateDTO;
} => !!value && typeof value === "object" && "state" in (value as Record<string, unknown>);

export default function StartGamesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { ensureSession } = useAdminAuth();

  const [gameState, setGameState] = useState<GameStateDTO | null>(null);
  const [fetchingState, setFetchingState] = useState(true);
  const [starting, setStarting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const showAlert = useCallback((title: string, message?: string) => {
    if (Platform.OS === "web") {
      const content = message ? `${title}\n\n${message}` : title;
      if (typeof window !== "undefined") {
        window.alert(content);
      }
      return;
    }
    Alert.alert(title, message);
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const state = await adminApi.getGameState();
      if (!isGameState(state)) {
        throw new Error("Unexpected response shape");
      }
      setGameState(state);
    } catch (error) {
      const apiError = error as ApiError;
      const message =
        apiError?.message ||
        (error instanceof Error ? error.message : undefined) ||
        "Unable to load the current game status.";
      showAlert("Status unavailable", message);
    } finally {
      setFetchingState(false);
    }
  }, [showAlert]);

  useEffect(() => {
    setFetchingState(true);
    void refreshState();
  }, [refreshState]);

  const alreadyStarted = gameState?.started ?? false;
  const startedAt = useMemo(() => gameState?.startedAt, [gameState]);

  const handleStartGames = useCallback(async () => {
    const ok = await ensureSession({ silent: true });
    if (!ok) {
      showAlert("Session expired", "Please sign in again before starting the games.");
      return;
    }

    setStarting(true);
    try {
      const result = await adminApi.startGames();
      if (!isGameStateResponse(result)) {
        throw new Error("Unexpected response shape");
      }
      setGameState(result.state);
      showAlert("Party launched", "All guests can now see their partner clues in the app.");
      if (Platform.OS !== "web") {
        router.back();
      }
    } catch (error) {
      const apiError = error as ApiError;
      const message =
        apiError?.message ||
        (error instanceof Error ? error.message : undefined) ||
        "Something went wrong while starting the games.";
      showAlert("Unable to start games", message);
    } finally {
      setStarting(false);
    }
  }, [ensureSession, router, showAlert]);

  const confirmReset = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        return window.confirm(
          "Resetting the game will lock partner clues again and clear progress. Do you want to continue?"
        );
      }
      return false;
    }

    return await new Promise((resolve) => {
      Alert.alert(
        "Reset game state?",
        "This will lock partner clues for all guests and set progress back to the beginning.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Reset",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }, []);

  const handleResetGames = useCallback(async () => {
    const ok = await ensureSession({ silent: true });
    if (!ok) {
      showAlert("Session expired", "Please sign in again before resetting the games.");
      return;
    }

    const confirmed = await confirmReset();
    if (!confirmed) return;

    setResetting(true);
    try {
      const result = await adminApi.resetGames();
      if (!isGameStateResponse(result)) {
        throw new Error("Unexpected response shape");
      }
      setGameState(result.state);
      showAlert("Game reset", "Guests can no longer see partner clues until you start the games again.");
      if (Platform.OS !== "web") {
        router.back();
      }
    } catch (error) {
      const apiError = error as ApiError;
      const message =
        apiError?.message ||
        (error instanceof Error ? error.message : undefined) ||
        "Something went wrong while resetting the games.";
      showAlert("Unable to reset games", message);
    } finally {
      setResetting(false);
    }
  }, [confirmReset, ensureSession, router, showAlert]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Start games" }} />
      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: theme.background }]}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: theme.primaryMuted, borderColor: theme.border }]}>
          <IconSymbol name="person.2.square.stack" size={26} color={theme.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 6 }}>
              Ready for launch
            </ThemedText>
            <ThemedText style={{ color: theme.textMuted, lineHeight: 20 }}>
              Starting the games unlocks every guest’s partner clues and signals that the party has begun.
            </ThemedText>
          </View>
        </View>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>
            Current status
          </ThemedText>
          {fetchingState ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText style={{ marginLeft: 12, color: theme.textMuted }}>Checking game state…</ThemedText>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <IconSymbol
                name={alreadyStarted ? "checkmark.circle" : "play.circle.fill"}
                size={24}
                color={alreadyStarted ? theme.success : theme.accent}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <ThemedText type="defaultSemiBold">
                  {alreadyStarted ? "Games already started" : "Games have not started yet"}
                </ThemedText>
                {alreadyStarted ? (
                  <ThemedText style={{ color: theme.textMuted, marginTop: 2 }}>
                    {startedAt
                      ? `Launched ${new Date(startedAt).toLocaleString()}`
                      : "Guests can already see their partner clues."}
                  </ThemedText>
                ) : (
                  <ThemedText style={{ color: theme.textMuted, marginTop: 2 }}>
                    Guests are still waiting. Start the games to reveal partner clues and enable the challenges.
                  </ThemedText>
                )}
              </View>
            </View>
          )}
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="subtitle" style={{ marginBottom: 10 }}>
            Start the party
          </ThemedText>
          <ThemedText style={{ color: theme.textMuted, marginBottom: 18, lineHeight: 22 }}>
            Once you press start, all guests will immediately have access to their partner clues. This action can’t be
            undone, but you can always reset the game from the control tab afterwards.
          </ThemedText>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleStartGames}
            disabled={starting || alreadyStarted}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.accent,
                opacity: starting || alreadyStarted ? 0.75 : 1,
                shadowColor: theme.shadowColor,
              },
            ]}>
            {starting ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <IconSymbol name="play.circle.fill" size={26} color={theme.text} style={{ marginRight: 10 }} />
                <ThemedText type="defaultSemiBold" lightColor={theme.text} darkColor={theme.text}>
                  {alreadyStarted ? "Games already started" : "Start games now"}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="subtitle" style={{ marginBottom: 10 }}>
            Reset the game
          </ThemedText>
          <ThemedText style={{ color: theme.textMuted, marginBottom: 18, lineHeight: 22 }}>
            Need a do-over? Resetting hides partner clues again and clears progress so you can restart the party flow
            when you’re ready.
          </ThemedText>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleResetGames}
            disabled={resetting}
            style={[
              styles.dangerButton,
              {
                backgroundColor: theme.danger,
                opacity: resetting ? 0.75 : 1,
                shadowColor: theme.shadowColor,
              },
            ]}>
            {resetting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name="reload-data" size={24} color="#fff" style={{ marginRight: 10 }} />
                <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">
                  Reset game state
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    flexGrow: 1,
  },
  banner: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryButton: {
    marginTop: 6,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  dangerButton: {
    marginTop: 6,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
});
