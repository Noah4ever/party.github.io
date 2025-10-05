import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminApi, ApiError, QuizPenaltyConfigDTO } from "@/lib/api";
import { showAlert, showError } from "@/lib/dialogs";

function formatSeconds(value: number): string {
  return `${value.toLocaleString("de-DE")} Sekunden`;
}

export default function QuizPenaltyScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [minorSeconds, setMinorSeconds] = useState("60");
  const [majorSeconds, setMajorSeconds] = useState("180");

  const loadConfig = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const ok = await ensureSession();
      if (!ok) {
        setLoading(false);
        return;
      }
      const config = (await adminApi.getQuizPenaltyConfig()) as QuizPenaltyConfigDTO;
      setMinorSeconds(String(config.minorPenaltySeconds));
      setMajorSeconds(String(config.majorPenaltySeconds));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load penalty settings";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ensureSession]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadConfig();
    }, [loadConfig])
  );

  const parseSeconds = useCallback((value: string) => {
    const normalized = value.replace(/[^0-9]/g, "");
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);

    const minorValue = parseSeconds(minorSeconds);
    const majorValue = parseSeconds(majorSeconds);

    if (minorValue === null || majorValue === null) {
      showAlert({
        title: "Ungültige Eingabe",
        message: "Bitte gebt für beide Felder eine nicht-negative Zahl ein.",
      });
      return;
    }

    if (majorValue < minorValue) {
      showAlert({
        title: "Prüft die Werte",
        message: "Die Strafe für >75% falsche Antworten sollte mindestens so hoch sein wie für >50%.",
      });
      return;
    }

    try {
      const ok = await ensureSession();
      if (!ok) return;
      setSaving(true);
      await adminApi.updateQuizPenaltyConfig({
        minorPenaltySeconds: minorValue,
        majorPenaltySeconds: majorValue,
      });
      setSuccessMessage("Einstellungen gespeichert");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Speichern nicht möglich";
      showError(message);
    } finally {
      setSaving(false);
    }
  }, [ensureSession, majorSeconds, minorSeconds, parseSeconds]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={{ marginTop: 12, color: theme.textMuted }}>Einstellungen werden geladen …</ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <IconSymbol name="exclamationmark.triangle" size={28} color={theme.danger} />
          <ThemedText style={{ marginTop: 12, color: theme.danger, textAlign: "center" }}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}
            onPress={() => {
              setLoading(true);
              void loadConfig();
            }}>
            <IconSymbol name="arrow.clockwise" size={16} color={theme.primary} />
            <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>Erneut versuchen</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText type="subtitle">Zeitstrafen konfigurieren</ThemedText>
            <ThemedText style={{ color: theme.textMuted, fontSize: 13 }}>
              Legt fest, wie viele Sekunden bei vielen falschen Antworten im Quiz addiert werden.
            </ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <IconSymbol name="checkmark.circle" size={18} color="#fff" />
                <ThemedText style={styles.primaryButtonText}>Speichern</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.inputLabel}>Mehr als 50% falsch beantwortet</ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              value={minorSeconds}
              onChangeText={(value) => {
                setMinorSeconds(value.replace(/[^0-9]/g, ""));
                setSuccessMessage(null);
              }}
              inputMode="numeric"
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={theme.placeholder}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBackground },
              ]}
            />
            <ThemedText style={{ color: theme.textMuted }}>Sek.</ThemedText>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.inputLabel}>Mehr als 75% falsch beantwortet</ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              value={majorSeconds}
              onChangeText={(value) => {
                setMajorSeconds(value.replace(/[^0-9]/g, ""));
                setSuccessMessage(null);
              }}
              inputMode="numeric"
              keyboardType="number-pad"
              placeholder="180"
              placeholderTextColor={theme.placeholder}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBackground },
              ]}
            />
            <ThemedText style={{ color: theme.textMuted }}>Sek.</ThemedText>
          </View>
        </View>

        {successMessage ? (
          <View
            style={[styles.messageBanner, { borderColor: theme.success, backgroundColor: "rgba(34,197,94,0.15)" }]}
            accessibilityLiveRegion="polite">
            <IconSymbol name="checkmark.circle" size={18} color={theme.success} />
            <ThemedText style={{ color: theme.success, fontWeight: "600" }}>{successMessage}</ThemedText>
          </View>
        ) : null}
      </ThemedView>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Quiz Penalty" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 100, default: 0 })}>
        <ScrollView contentContainerStyle={{ padding: 16 }} style={{ flex: 1, backgroundColor: theme.background }}>
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 48,
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formGroup: {
    gap: 8,
  },
  inputLabel: {
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  messageBanner: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
