import { Stack, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts, useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, adminApi } from "@/lib/api";

const generateCode = () => String(Math.floor(1000 + Math.random() * 9000));

export default function ClearDataScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { ensureSession } = useAdminAuth();

  const [code] = useState(generateCode);
  const [digits, setDigits] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [clearing, setClearing] = useState(false);
  const inputsRef = useRef<(TextInput | null)[]>([]);

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

  const resetDigits = useCallback(() => {
    setDigits(["", "", "", ""]);
    setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 50);
  }, []);

  const handleDigitChange = useCallback((index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "");
    if (sanitized.length === 0) {
      setDigits((prev) => {
        const next = [...prev] as typeof prev;
        next[index] = "";
        return next;
      });
      return;
    }

    const char = sanitized.charAt(sanitized.length - 1);
    setDigits((prev) => {
      const next = [...prev] as typeof prev;
      next[index] = char;
      return next;
    });

    const nextIndex = index + 1;
    if (nextIndex < inputsRef.current.length) {
      inputsRef.current[nextIndex]?.focus();
    }
  }, []);

  const handleKeyPress = useCallback(
    (index: number, event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (event.nativeEvent.key === "Backspace" && digits[index] === "") {
        const prevIndex = index - 1;
        if (prevIndex >= 0) {
          inputsRef.current[prevIndex]?.focus();
          setDigits((prev) => {
            const next = [...prev] as typeof prev;
            next[prevIndex] = "";
            return next;
          });
        }
      }
    },
    [digits]
  );

  const normalizedInput = useMemo(() => digits.join(""), [digits]);
  const isComplete = normalizedInput.length === 4;
  const isMatch = isComplete && normalizedInput === code;

  const handleSubmit = useCallback(async () => {
    if (!isComplete) return;

    if (!isMatch) {
      showAlert("Incorrect code", "Please type the confirmation code exactly as shown above.");
      resetDigits();
      return;
    }

    const ok = await ensureSession({ silent: true });
    if (!ok) {
      showAlert("Session expired", "Please sign in again before deleting all data.");
      return;
    }

    setClearing(true);
    try {
      await adminApi.clearAllData();
      resetDigits();
      showAlert("All data deleted", "Guests, groups, passwords, and game progress have been removed.");
      router.replace("/admin/(tabs)/control");
    } catch (error) {
      const apiError = error as ApiError;
      const message = apiError?.message || "Something went wrong while attempting to clear the data.";
      showAlert("Deletion failed", message);
    } finally {
      setClearing(false);
    }
  }, [ensureSession, isComplete, isMatch, resetDigits, router, showAlert]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Delete all data" }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
          bounces={false}>
          <View style={[styles.banner, { backgroundColor: theme.danger }]}>
            <IconSymbol name="trash.fill" size={28} color={theme.text} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" lightColor="#ffffff" darkColor="#ffffff" style={{ marginBottom: 4 }}>
                Danger zone
              </ThemedText>
              <ThemedText lightColor="#ffe4e4" darkColor="#ffe4e4" style={{ fontSize: 15, lineHeight: 22 }}>
                This will permanently erase all guests, groups, progress, and custom questions. There is no undo.
              </ThemedText>
            </View>
          </View>

          <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>
              Step 1 — confirm the generated code
            </ThemedText>
            <ThemedText style={{ color: theme.textMuted, marginBottom: 16 }}>
              Enter the four digits below to confirm you understand what will be deleted.
            </ThemedText>

            <View style={[styles.codeBox, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}>
              <ThemedText
                type="title"
                lightColor={theme.danger}
                darkColor={theme.danger}
                style={[styles.codeText, { letterSpacing: 12 }]}>
                {code}
              </ThemedText>
            </View>

            <View style={styles.digitRow}>
              {digits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputsRef.current[index] = ref;
                  }}
                  value={digit}
                  editable={!clearing}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  inputMode="numeric"
                  maxLength={1}
                  onChangeText={(value) => handleDigitChange(index, value)}
                  onKeyPress={(event) => handleKeyPress(index, event)}
                  style={[
                    styles.digitInput,
                    { borderColor: theme.border, backgroundColor: theme.inputBackground, color: theme.text },
                  ]}
                  autoFocus={index === 0}
                  returnKeyType="done"
                />
              ))}
            </View>
          </ThemedView>

          <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card, marginTop: 12 }]}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 10, color: theme.danger }}>
              Step 2 — delete everything
            </ThemedText>
            <ThemedText style={{ color: theme.textMuted, marginBottom: 18 }}>
              When you proceed, the following collections will be wiped:
            </ThemedText>
            <View style={styles.listItem}>
              <IconSymbol name="people-outline" size={18} color={theme.textMuted} style={styles.listIcon} />
              <ThemedText style={{ color: theme.textMuted }}>Guests & their clues</ThemedText>
            </View>
            <View style={styles.listItem}>
              <IconSymbol name="person.2.square.stack" size={18} color={theme.textMuted} style={styles.listIcon} />
              <ThemedText style={{ color: theme.textMuted }}>Groups & progress</ThemedText>
            </View>
            <View style={styles.listItem}>
              <IconSymbol name="list.bullet" size={18} color={theme.textMuted} style={styles.listIcon} />
              <ThemedText style={{ color: theme.textMuted }}>Game packs & questions</ThemedText>
            </View>
            <View style={styles.listItem}>
              <IconSymbol name="lock.circle" size={18} color={theme.textMuted} style={styles.listIcon} />
              <ThemedText style={{ color: theme.textMuted }}>Password game settings</ThemedText>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isComplete || clearing}
              style={[
                styles.dangerButton,
                {
                  backgroundColor: theme.danger,
                  opacity: !isComplete || clearing ? 0.7 : 1,
                  shadowColor: theme.shadowColor,
                },
              ]}
              accessibilityRole="button">
              {clearing ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <>
                  <IconSymbol name="trash.fill" size={18} color={theme.text} style={{ marginRight: 8 }} />
                  <ThemedText type="defaultSemiBold" lightColor={theme.background} darkColor={theme.text}>
                    Permanently delete all data
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    flexGrow: 1,
  },
  banner: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  codeBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  codeText: {
    fontFamily: Fonts.mono,
  },
  digitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  digitInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    width: 56,
    height: 56,
    fontSize: 24,
    fontFamily: Fonts.mono,
    textAlign: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  listIcon: {
    marginRight: 10,
  },
  dangerButton: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
