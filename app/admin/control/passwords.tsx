import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, PasswordGameConfigDTO, passwordGameApi } from "@/lib/api";
import { confirm, showError } from "@/lib/dialogs";
export default function PasswordConfigsScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();

  const [config, setConfig] = useState<PasswordGameConfigDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");

  const loadConfig = useCallback(async () => {
    setError(null);
    try {
      const ok = await ensureSession();
      if (!ok) {
        setLoading(false);
        setRefreshing(false);
        setBusyAction(null);
        return;
      }
      const data = (await passwordGameApi.get()) as PasswordGameConfigDTO;
      setConfig(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load configuration";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setBusyAction(null);
    }
  }, [ensureSession]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadConfig();
    }, [loadConfig])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadConfig();
  }, [loadConfig]);

  const handleToggleActive = useCallback(
    async (value: boolean) => {
      setBusyAction("toggle");
      try {
        const ok = await ensureSession();
        if (!ok) {
          setBusyAction(null);
          return;
        }
        await passwordGameApi.update({ active: value });
        await loadConfig();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to change status";
        showError(message);
      } finally {
        setBusyAction(null);
      }
    },
    [ensureSession, loadConfig]
  );

  const handleAddPassword = useCallback(async () => {
    const value = passwordDraft.trim();
    if (!value) return;
    setBusyAction("add");
    try {
      const ok = await ensureSession();
      if (!ok) {
        setBusyAction(null);
        return;
      }
      await passwordGameApi.addPassword(value);
      setPasswordDraft("");
      await loadConfig();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to add password";
      showError(message);
    } finally {
      setBusyAction(null);
    }
  }, [ensureSession, loadConfig, passwordDraft]);

  const handleRemovePassword = useCallback(
    async (password: string) => {
      const confirmed = await confirm({
        title: "Remove password",
        message: `Remove "${password}"?`,
        confirmLabel: "Remove",
        destructive: true,
      });
      if (!confirmed) return;
      setBusyAction(`remove:${password}`);
      try {
        const ok = await ensureSession();
        if (!ok) {
          setBusyAction(null);
          return;
        }
        await passwordGameApi.removePassword(password);
        await loadConfig();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to remove password";
        showError(message);
      } finally {
        setBusyAction(null);
      }
    },
    [ensureSession, loadConfig]
  );

  const handleStart = useCallback(async () => {
    setBusyAction("start");
    try {
      const ok = await ensureSession();
      if (!ok) {
        setBusyAction(null);
        return;
      }
      await passwordGameApi.start();
      await loadConfig();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to start game";
      showError(message);
    } finally {
      setBusyAction(null);
    }
  }, [ensureSession, loadConfig]);

  const isBusy = busyAction !== null;
  const removingPassword = busyAction?.startsWith("remove:") ? busyAction.slice("remove:".length) : null;
  const passwords = config?.validPasswords ?? [];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Passwords" }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
          />
        }>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : config ? (
          <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.headerRow}>
              <ThemedText type="subtitle">Password Game</ThemedText>
              <View style={styles.statusRow}>
                <ThemedText style={{ color: theme.textMuted }}>Active</ThemedText>
                <Switch
                  value={config.active}
                  onValueChange={handleToggleActive}
                  trackColor={{ true: theme.accent, false: theme.border }}
                  disabled={isBusy && busyAction !== "toggle"}
                />
              </View>
            </View>

            <View style={styles.passwordList}>
              {passwords.length === 0 ? (
                <ThemedText style={{ color: theme.textMuted }}>No passwords yet.</ThemedText>
              ) : (
                passwords.map((password) => (
                  <View
                    key={password}
                    style={[
                      styles.passwordRow,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                    ]}>
                    <ThemedText>{password}</ThemedText>
                    <TouchableOpacity disabled={isBusy} onPress={() => handleRemovePassword(password)}>
                      {removingPassword === password ? (
                        <ActivityIndicator color={theme.danger} />
                      ) : (
                        <IconSymbol name="trash.fill" size={18} color={theme.danger} />
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.addPasswordRow}>
              <TextInput
                value={passwordDraft}
                onChangeText={setPasswordDraft}
                placeholder="New password"
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  styles.flex,
                  {
                    color: theme.inputText,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                  },
                ]}
                editable={!isBusy}
              />
              <PrimaryButton
                label="Add"
                onPress={handleAddPassword}
                disabled={!passwordDraft.trim() || isBusy}
                loading={busyAction === "add"}
              />
            </View>

            <View style={styles.rowButtons}>
              <PrimaryButton label="Start" onPress={handleStart} disabled={isBusy} loading={busyAction === "start"} />
            </View>

            <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
              Created: {formatRelative(config.startedAt)}
            </ThemedText>
            {config.updatedAt ? (
              <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                Updated: {formatRelative(config.updatedAt)}
              </ThemedText>
            ) : null}
            {config.endedAt ? (
              <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                Ended: {formatRelative(config.endedAt)}
              </ThemedText>
            ) : null}
          </ThemedView>
        ) : (
          <ThemedText style={{ color: theme.textMuted }}>No configuration found.</ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: theme.accent,
          opacity: disabled || loading ? 0.6 : 1,
        },
      ]}>
      <ThemedText style={{ color: theme.background, fontWeight: "600" }}>
        {loading ? "Please wait..." : label}
      </ThemedText>
    </TouchableOpacity>
  );
}

function formatRelative(value?: string) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  passwordList: {
    gap: 8,
  },
  passwordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addPasswordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loader: {
    marginTop: 24,
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
});
