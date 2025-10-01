import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, NeverHaveIEverPackDTO, neverHaveIEverApi } from "@/lib/api";
import { confirm, showAlert, showError } from "@/lib/dialogs";

export default function NeverHaveIEverScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();
  const [pack, setPack] = useState<NeverHaveIEverPackDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [newStatement, setNewStatement] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const loadPack = useCallback(async () => {
    setError(null);
    try {
      const sessionOk = await ensureSession();
      if (!sessionOk) {
        setLoading(false);
        setRefreshing(false);
        setWorking(false);
        return;
      }
      const packs = (await neverHaveIEverApi.list()) as NeverHaveIEverPackDTO[];
      let primary = packs[0];
      if (!primary) {
        const created = (await neverHaveIEverApi.create({
          title: "Standard Pack",
          statements: [],
        })) as NeverHaveIEverPackDTO;
        primary = created;
      }
      setPack(primary);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load statements";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setWorking(false);
    }
  }, [ensureSession]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadPack();
    }, [loadPack])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPack();
  }, [loadPack]);

  const persistStatements = useCallback(
    async (nextStatements: string[]) => {
      if (!pack) return;
      const sessionOk = await ensureSession();
      if (!sessionOk) {
        setWorking(false);
        return;
      }
      setWorking(true);
      try {
        const updated = (await neverHaveIEverApi.update(pack.id, {
          statements: nextStatements,
        })) as NeverHaveIEverPackDTO;
        setPack(updated);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to save changes";
        showError(message);
      } finally {
        setWorking(false);
      }
    },
    [ensureSession, pack]
  );

  const handleAddStatement = useCallback(() => {
    const value = newStatement.trim();
    if (!value || !pack) return;
    if ((pack.statements ?? []).some((statement) => statement.toLowerCase() === value.toLowerCase())) {
      showAlert({ title: "Heads up", message: "This statement already exists." });
      return;
    }
    const next = [...(pack.statements ?? []), value];
    setNewStatement("");
    void persistStatements(next);
  }, [newStatement, pack, persistStatements]);

  const startEdit = useCallback(
    (index: number) => {
      if (!pack) return;
      setEditingIndex(index);
      setEditingValue(pack.statements[index] ?? "");
    },
    [pack]
  );

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingValue("");
  }, []);

  const saveEdit = useCallback(() => {
    if (editingIndex === null || !pack) return;
    const value = editingValue.trim();
    if (!value) {
      showAlert({
        title: "Heads up",
        message: "Please enter some text or delete the statement.",
      });
      return;
    }
    const next = [...pack.statements];
    next[editingIndex] = value;
    setEditingIndex(null);
    setEditingValue("");
    void persistStatements(next);
  }, [editingIndex, editingValue, pack, persistStatements]);

  const deleteStatement = useCallback(
    async (index: number) => {
      if (!pack) return;
      const confirmed = await confirm({
        title: "Delete statement",
        message: "Delete this statement?",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
      const next = pack.statements.filter((_, idx) => idx !== index);
      void persistStatements(next);
    },
    [pack, persistStatements]
  );

  const statements = pack?.statements ?? [];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Never Have I Ever" }} />
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
        {pack ? (
          <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <ThemedText type="subtitle">Statements</ThemedText>
            <ThemedText style={{ color: theme.textMuted }}>Manage all statements for the game here.</ThemedText>
            <View style={{ gap: 12 }}>
              {statements.length === 0 ? (
                <ThemedText style={{ color: theme.textMuted }}>No statements yet.</ThemedText>
              ) : (
                statements.map((statement, index) => {
                  const isEditing = editingIndex === index;
                  return (
                    <ThemedView
                      key={`${pack.id}-${index}`}
                      style={[
                        styles.statementRow,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}>
                      {isEditing ? (
                        <View style={{ gap: 8 }}>
                          <TextInput
                            value={editingValue}
                            onChangeText={setEditingValue}
                            placeholder="Statement"
                            placeholderTextColor={theme.placeholder}
                            style={[
                              styles.input,
                              {
                                color: theme.inputText,
                                backgroundColor: theme.inputBackground,
                                borderColor: theme.border,
                              },
                            ]}
                            multiline
                          />
                          <View style={styles.rowButtons}>
                            <PrimaryButton label="Save" onPress={saveEdit} loading={working} />
                            <SecondaryButton label="Cancel" onPress={cancelEdit} />
                          </View>
                        </View>
                      ) : (
                        <>
                          <ThemedText>{statement}</ThemedText>
                          <View style={styles.rowButtons}>
                            <SecondaryButton label="Edit" onPress={() => startEdit(index)} />
                            <SecondaryButton label="Delete" destructive onPress={() => deleteStatement(index)} />
                          </View>
                        </>
                      )}
                    </ThemedView>
                  );
                })
              )}
            </View>
            <View style={styles.addRow}>
              <TextInput
                value={newStatement}
                onChangeText={setNewStatement}
                placeholder="New statement"
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
                multiline
              />
              <PrimaryButton
                label="Add"
                onPress={handleAddStatement}
                disabled={!newStatement.trim() || working}
                loading={working}
              />
            </View>
          </ThemedView>
        ) : null}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : null}
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
      style={[
        styles.button,
        {
          backgroundColor: theme.accent,
          opacity: disabled || loading ? 0.6 : 1,
        },
      ]}
      disabled={disabled || loading}>
      <ThemedText style={{ color: theme.background, fontWeight: "600" }}>
        {loading ? "Please wait..." : label}
      </ThemedText>
    </TouchableOpacity>
  );
}

function SecondaryButton({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: destructive ? theme.danger : theme.surface,
        },
      ]}>
      <ThemedText style={{ color: destructive ? theme.background : theme.text }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  statementRow: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 12,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
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
    alignItems: "center",
  },
  loader: {
    marginTop: 24,
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
});
