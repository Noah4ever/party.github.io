import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";

import { Button } from "@/components/game/Button";
import { HintBox } from "@/components/game/HintBox";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { passwordGameApi } from "@/lib/api";
import { useRouter } from "expo-router";

const headerColors = { light: "#FDE68A", dark: "#1F2937" };

export default function PasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const inputsRef = useRef<(TextInput | null)[]>([]);

  const [validPasswords, setValidPasswords] = useState<string[]>([]);
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptedInvalid, setAttemptedInvalid] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordLength = useMemo(() => {
    if (validPasswords.length === 0) {
      return 0;
    }
    const targetLength = validPasswords[0]?.length ?? 0;
    return Number.isFinite(targetLength) ? targetLength : 0;
  }, [validPasswords]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        const res = await passwordGameApi.get();
        if (!mounted) {
          return;
        }
        if (res && "validPasswords" in res && Array.isArray(res.validPasswords) && res.validPasswords.length > 0) {
          setValidPasswords(res.validPasswords as string[]);
          setError(null);
        } else {
          setError("Passwortliste konnte nicht geladen werden.");
        }
      } catch (err) {
        console.error("passwords load failed", err);
        if (mounted) {
          setError("Passwortliste konnte nicht geladen werden.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (passwordLength <= 0) {
      setDigits([]);
      inputsRef.current = [];
      return;
    }
    setDigits((prev) => {
      if (prev.length === passwordLength) {
        return prev;
      }
      const next = new Array(passwordLength).fill("");
      prev.slice(0, passwordLength).forEach((char, index) => {
        next[index] = char;
      });
      return next;
    });
    inputsRef.current = new Array(passwordLength).fill(null);
  }, [passwordLength]);

  useEffect(() => {
    if (passwordLength > 0) {
      const timer = setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 140);
      return () => clearTimeout(timer);
    }
  }, [passwordLength]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.navigate("/game/final");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [router, success]);

  const normalizedInput = useMemo(() => digits.join("").toUpperCase(), [digits]);
  const isComplete = passwordLength > 0 && digits.every((digit) => digit.trim().length === 1);

  const isMatch = useMemo(() => {
    if (!isComplete) {
      return false;
    }
    const normal = normalizedInput.trim();
    return validPasswords.some((password) => password.toUpperCase().trim() === normal);
  }, [isComplete, normalizedInput, validPasswords]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    setAttemptedInvalid(false);
    const sanitized = value.replace(/\s+/g, "");

    if (sanitized.length === 0) {
      setDigits((prev) => {
        const next = [...prev];
        if (index < next.length) {
          next[index] = "";
        }
        return next;
      });
      return;
    }

    const char = sanitized.charAt(sanitized.length - 1).toUpperCase();
    setDigits((prev) => {
      const next = [...prev];
      if (index < next.length) {
        next[index] = char;
      }
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
            const next = [...prev];
            next[prevIndex] = "";
            return next;
          });
        }
      }
    },
    [digits]
  );

  const handleSubmit = useCallback(() => {
    if (!isComplete) {
      setAttemptedInvalid(true);
      return;
    }

    if (isMatch) {
      setSuccess(true);
      setAttemptedInvalid(false);
      return;
    }

    setAttemptedInvalid(true);
    setSuccess(false);
  }, [isComplete, isMatch]);

  return (
    <ThemedView style={styles.screen}>
      <ParallaxScrollView
        headerBackgroundColor={headerColors}
        headerHeight={180}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPink]} />
            <View style={[styles.partyGlow, styles.partyGlowBlue]} />
            <Image source={require("@/assets/images/crown.png")} style={styles.partyCrown} contentFit="contain" />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
          </View>
        }>
        <ThemedView
          style={[styles.card, styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}
          testID="password-hero-card">
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>
              Finale Challenge
            </ThemedText>
            <HelloWave />
          </View>
          <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
            Ihr habt es fast geschafft! Holt euch den geheimen Code vom Gastgeber und gebt ihn hier ein, um den letzten
            Schritt ins Finale freizuschalten.
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: theme.backgroundAlt, borderColor: theme.border }]}>
            <IconSymbol name="lock.circle" size={18} color={theme.primary} />
            <ThemedText style={[styles.statusBadgeLabel, { color: theme.textMuted }]}>
              Nur das richtige Passwort öffnet die Tür.
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="subtitle" style={styles.sectionHeading}>
            Gastgeber-Schlüssel
          </ThemedText>
          <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
            Jeder gültige Code hat die gleiche Länge. Tragt gemeinsam die Zeichen ein und bestätigt eure Eingabe.
          </ThemedText>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.loadingText, { color: theme.textMuted }]}>Codes werden geladen …</ThemedText>
            </View>
          ) : error ? (
            <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
          ) : passwordLength === 0 ? (
            <ThemedText style={[styles.errorText, { color: theme.textMuted }]}>
              Keine Passwörter verfügbar. Fragt den Gastgeber, ob das Spiel korrekt vorbereitet wurde.
            </ThemedText>
          ) : (
            <>
              <View style={styles.digitsRow}>
                {digits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputsRef.current[index] = ref;
                    }}
                    value={digit}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    keyboardType="default"
                    inputMode="text"
                    maxLength={1}
                    onChangeText={(value) => handleDigitChange(index, value)}
                    onKeyPress={(event) => handleKeyPress(index, event)}
                    style={[
                      styles.digitInput,
                      {
                        borderColor: attemptedInvalid && isComplete && !isMatch ? theme.danger : theme.border,
                        backgroundColor: theme.inputBackground,
                        color: theme.text,
                      },
                    ]}
                    returnKeyType="next"
                    selectionColor={theme.primary}
                    accessibilityLabel={`Passwortzeichen ${index + 1}`}
                  />
                ))}
              </View>
              {attemptedInvalid && isComplete && !isMatch ? (
                <View style={[styles.feedbackRow, styles.feedbackRowError, { borderColor: theme.danger }]}>
                  <IconSymbol name="xmark.circle" size={18} color={theme.danger} style={{ marginRight: 8 }} />
                  <ThemedText style={[styles.feedbackText, { color: theme.danger }]}>
                    Das war nicht der richtige Code. Probiert es erneut!
                  </ThemedText>
                </View>
              ) : null}
              {success ? (
                <View style={[styles.feedbackRow, styles.feedbackRowSuccess, { borderColor: theme.success }]}>
                  <IconSymbol name="checkmark.circle" size={18} color={theme.success} style={{ marginRight: 8 }} />
                  <ThemedText style={[styles.feedbackText, { color: theme.success }]}>
                    Richtig! Ihr werdet jetzt ins Finale teleportiert …
                  </ThemedText>
                </View>
              ) : null}
              <Button onPress={handleSubmit} iconText="arrow.right.circle">
                {isComplete ? "Schlüssel einlösen" : "Code eingeben"}
              </Button>
            </>
          )}
        </ThemedView>
      </ParallaxScrollView>

      <HintBox>
        Tipp: Der Gastgeber verrät euch den Code nur, wenn ihr den Shot gemeinsam trinkt – also seid charmant und
        aufmerksam!
      </HintBox>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleText: {
    flex: 1,
  },
  leadText: {
    fontSize: 16,
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "600",
  },
  sectionIntro: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    lineHeight: 22,
  },
  digitsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  digitInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    width: 60,
    height: 64,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
  },
  feedbackRow: {
    marginTop: -4,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
  feedbackRowError: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  feedbackRowSuccess: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  feedbackText: {
    fontSize: 15,
    flex: 1,
  },
  partyHeader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  partyGlow: {
    position: "absolute",
    borderRadius: 200,
    width: 260,
    height: 260,
    opacity: 0.55,
  },
  partyGlowPink: {
    backgroundColor: "rgba(236,72,153,0.4)",
    transform: [{ translateX: -30 }],
  },
  partyGlowBlue: {
    backgroundColor: "rgba(59,130,246,0.35)",
    transform: [{ translateX: 60 }, { translateY: 20 }],
  },
  partyCrown: {
    width: 210,
    height: 150,
  },
  confetti: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
  },
  confettiOne: {
    height: 34,
    backgroundColor: "#F59E0B",
    top: 30,
    left: 60,
    transform: [{ rotate: "18deg" }],
  },
  confettiTwo: {
    height: 26,
    backgroundColor: "#22C55E",
    top: 40,
    right: 70,
    transform: [{ rotate: "-16deg" }],
  },
  confettiThree: {
    height: 30,
    backgroundColor: "#8B5CF6",
    bottom: 30,
    right: 90,
    transform: [{ rotate: "32deg" }],
  },
});
