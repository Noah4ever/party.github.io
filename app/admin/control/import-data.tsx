import { Stack } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, adminApi } from "@/lib/api";

type FileMeta = {
  name: string;
  size: number;
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

export default function ImportDataScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();
  const isWeb = Platform.OS === "web";

  const [jsonText, setJsonText] = useState("");
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const characterCount = jsonText.length;
  const instructions = useMemo(
    () => [
      "Importing will replace guests, groups, game packs, answers, uploads metadata, and quiz penalties.",
      "Review the JSON before submitting — there is no undo.",
      "You'll need a valid admin session to confirm the import.",
    ],
    []
  );

  const handlePickFile = useCallback(() => {
    if (!isWeb || typeof document === "undefined") {
      setStatus("error");
      setMessage("File uploads are currently available on the web dashboard.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const trimmed = text.trim();
        if (!trimmed) {
          setJsonText("");
        } else {
          const parsed = JSON.parse(trimmed);
          setJsonText(JSON.stringify(parsed, null, 2));
        }
        setFileMeta({ name: file.name, size: file.size });
        setStatus("idle");
        setMessage("");
      } catch (error) {
        console.error("Failed to read import file", error);
        setStatus("error");
        setMessage("The selected file does not contain valid JSON.");
        setFileMeta(null);
      } finally {
        if (target) {
          target.value = "";
        }
      }
    };

    input.click();
  }, [isWeb]);

  const handleImport = useCallback(async () => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Paste JSON or select a backup file first.");
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      setStatus("error");
      setMessage("Your JSON is not valid. Please fix any syntax errors.");
      return;
    }

    const ok = await ensureSession({ silent: true });
    if (!ok) {
      setStatus("error");
      setMessage("Session expired. Please sign in again before importing.");
      return;
    }

    setImporting(true);
    setStatus("idle");
    setMessage("");
    try {
      await adminApi.importData(payload as any);
      setStatus("success");
      setMessage("Import complete. The dataset has been replaced successfully.");
      setFileMeta(null);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.message || "Unable to import the dataset.";
      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setImporting(false);
    }
  }, [ensureSession, jsonText]);

  const handleClear = useCallback(() => {
    if (importing) return;
    setJsonText("");
    setFileMeta(null);
    setStatus("idle");
    setMessage("");
  }, [importing]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Import dataset" }} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={[styles.headerRow, { borderColor: theme.border }]}>
            <IconSymbol name="arrow.up.circle" size={24} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={{ marginBottom: 6 }}>
                Replace current dataset
              </ThemedText>
              <ThemedText style={{ color: theme.textMuted, lineHeight: 20 }}>
                You can select a JSON backup file or paste the contents below. Submitting will overwrite all existing
                data.
              </ThemedText>
            </View>
          </View>

          <View style={styles.bulletList}>
            {instructions.map((text, index) => (
              <View key={index} style={styles.bulletRow}>
                <IconSymbol
                  name="dot.circle"
                  size={12}
                  color={theme.textMuted}
                  style={{ marginTop: 6, marginRight: 8 }}
                />
                <ThemedText style={{ color: theme.textMuted, flex: 1, lineHeight: 18 }}>{text}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            1. Upload a backup file (optional)
          </ThemedText>
          <ThemedText style={{ color: theme.textMuted, marginBottom: 16 }}>
            Selecting a file will load the JSON into the editor below so you can review or adjust values before
            importing.
          </ThemedText>
          <TouchableOpacity
            onPress={handlePickFile}
            disabled={!isWeb}
            style={[
              styles.fileButton,
              {
                borderColor: theme.border,
                backgroundColor: isWeb ? theme.backgroundAlt : "rgba(148,163,184,0.2)",
                opacity: isWeb ? 1 : 0.6,
              },
            ]}>
            <IconSymbol name="tray.and.arrow.up" size={20} color={theme.primary} style={{ marginRight: 10 }} />
            <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
              {isWeb ? "Choose .json file" : "Available on web dashboard"}
            </ThemedText>
          </TouchableOpacity>
          {fileMeta ? (
            <View style={[styles.fileInfo, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}>
              <IconSymbol name="doc.text" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
              <ThemedText style={{ flex: 1 }} numberOfLines={2}>
                {fileMeta.name}
              </ThemedText>
              <ThemedText style={{ color: theme.textMuted, marginLeft: 8 }}>{formatBytes(fileMeta.size)}</ThemedText>
            </View>
          ) : null}
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            2. Paste or review JSON
          </ThemedText>
          <TextInput
            multiline
            value={jsonText}
            onChangeText={(value) => {
              setJsonText(value);
              setStatus("idle");
              setMessage("");
            }}
            placeholder="Paste your JSON backup here"
            placeholderTextColor={theme.placeholder}
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
                color: theme.text,
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />
          <View style={styles.inputFooter}>
            <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
              {characterCount.toLocaleString()} characters
            </ThemedText>
            <TouchableOpacity onPress={handleClear} disabled={importing} style={styles.clearButton}>
              <IconSymbol name="xmark.circle" size={16} color={theme.textMuted} style={{ marginRight: 4 }} />
              <ThemedText style={{ color: theme.textMuted, fontSize: 13 }}>Clear</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {status !== "idle" ? (
          <View
            style={[
              styles.notice,
              {
                borderColor: status === "success" ? theme.accent : theme.danger,
                backgroundColor: status === "success" ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)",
              },
            ]}>
            <IconSymbol
              name={status === "success" ? "checkmark.circle" : "exclamationmark.triangle"}
              size={18}
              color={status === "success" ? theme.accent : theme.danger}
              style={{ marginRight: 10 }}
            />
            <ThemedText style={{ flex: 1, color: status === "success" ? theme.accent : theme.danger }}>
              {message}
            </ThemedText>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleImport}
          disabled={importing}
          style={[
            styles.importButton,
            {
              backgroundColor: theme.primary,
              opacity: importing ? 0.7 : 1,
              shadowColor: theme.shadowColor,
            },
          ]}>
          {importing ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <>
              <IconSymbol name="arrow.up.circle" size={20} color={theme.background} style={{ marginRight: 8 }} />
              <ThemedText type="defaultSemiBold" lightColor={theme.background} darkColor={theme.background}>
                Import dataset
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 16,
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
  },
  fileButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    minHeight: 200,
    fontSize: 14,
    padding: 12,
    lineHeight: 18,
  },
  inputFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  notice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  importButton: {
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
