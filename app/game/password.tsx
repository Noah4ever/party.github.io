import { Image } from "expo-image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";

import { Button } from "@/components/game/Button";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { PasswordAttemptResponseDTO, passwordGameApi } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

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
  const [submitting, setSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

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
        if (
          res &&
          "validPasswords" in res &&
          Array.isArray(res.validPasswords) &&
          res.validPasswords.length > 0
        ) {
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
    (async () => {
      try {
        const storedGroupId = await AsyncStorage.getItem("groupId");
        if (storedGroupId) {
          setGroupId(storedGroupId);
        }
      } catch (err) {
        console.warn("password screen groupId load failed", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.navigate("/game/final");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [router, success]);

  const normalizedInput = useMemo(
    () => digits.join("").toUpperCase(),
    [digits]
  );
  const isComplete =
    passwordLength > 0 && digits.every((digit) => digit.trim().length === 1);

  const isMatch = useMemo(() => {
    if (!isComplete) {
      return false;
    }
    const normal = normalizedInput.trim();
    return validPasswords.some(
      (password) => password.toUpperCase().trim() === normal
    );
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
    (
      index: number,
      event: NativeSyntheticEvent<TextInputKeyPressEventData>
    ) => {
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

  const handleSubmit = useCallback(async () => {
    if (!isComplete) {
      setAttemptedInvalid(true);
      return;
    }

    if (!groupId) {
      showAlert({
        title: "Gruppe nicht gefunden",
        message:
          "Wir konnten deine Gruppenzuordnung nicht laden. Versuche es nach einem Neustart erneut.",
      });
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setAttemptedInvalid(false);

    try {
      const response = (await passwordGameApi.attempt(
        groupId,
        normalizedInput
      )) as PasswordAttemptResponseDTO;
      if (response.correct) {
        setSuccess(true);
        setAttemptedInvalid(false);
      } else {
        setAttemptedInvalid(true);
        setSuccess(false);
      }
    } catch (err) {
      console.error("password attempt failed", err);
      showAlert({
        title: "Überprüfung fehlgeschlagen",
        message:
          "Wir konnten den Versuch nicht speichern. Prüft eure Verbindung und versucht es erneut.",
      });
      setAttemptedInvalid(true);
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  }, [groupId, isComplete, normalizedInput, submitting]);

  return (
    <ThemedView style={styles.screen}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image
              source={require("@/assets/images/papa/led_crazy.png")}
              style={styles.papaLogo}
            />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
            <View style={[styles.confetti, styles.confettiFour]} />
          </View>
        }
      >
        <ThemedView
          style={[
            styles.card,
            styles.heroCard,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
          testID="password-hero-card"
        >
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>
              Finale Challenge
            </ThemedText>
            <HelloWave />
          </View>
          <ThemedText
            type="defaultSemiBold"
            style={[styles.leadText, { color: theme.textSecondary }]}
          >
            Ihr habt es fast geschafft! Bringt nun den Gastgeber einen Shot und
            trinkt mit ihn, mit etwas Glück und Charm wird er euch den Schlüssel
            verraten!
          </ThemedText>
        </ThemedView>

        <ThemedView
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <ThemedText type="subtitle" style={styles.sectionHeading}>
            Gastgeber-Schlüssel
          </ThemedText>
          <ThemedText
            style={[styles.sectionIntro, { color: theme.textSecondary }]}
          >
            Jeder gültige Code hat die gleiche Länge. Tragt gemeinsam die
            Zeichen ein und bestätigt eure Eingabe.
          </ThemedText>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText
                style={[styles.loadingText, { color: theme.textMuted }]}
              >
                Codes werden geladen …
              </ThemedText>
            </View>
          ) : error ? (
            <ThemedText style={[styles.errorText, { color: theme.danger }]}>
              {error}
            </ThemedText>
          ) : passwordLength === 0 ? (
            <ThemedText style={[styles.errorText, { color: theme.textMuted }]}>
              Keine Passwörter verfügbar. Fragt den Gastgeber, ob das Spiel
              korrekt vorbereitet wurde.
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
                        borderColor:
                          attemptedInvalid && isComplete && !isMatch
                            ? theme.danger
                            : theme.border,
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
                <View
                  style={[
                    styles.feedbackRow,
                    styles.feedbackRowError,
                    { borderColor: theme.danger },
                  ]}
                >
                  <IconSymbol
                    name="xmark.circle"
                    size={18}
                    color={theme.danger}
                    style={{ marginRight: 8 }}
                  />
                  <ThemedText
                    style={[styles.feedbackText, { color: theme.danger }]}
                  >
                    Das war nicht der richtige Code. Probiert es erneut!
                  </ThemedText>
                </View>
              ) : null}
              {success ? (
                <View
                  style={[
                    styles.feedbackRow,
                    styles.feedbackRowSuccess,
                    { borderColor: theme.success },
                  ]}
                >
                  <IconSymbol
                    name="checkmark.circle"
                    size={18}
                    color={theme.success}
                    style={{ marginRight: 8 }}
                  />
                  <ThemedText
                    style={[styles.feedbackText, { color: theme.success }]}
                  >
                    Richtig! Ihr werdet jetzt ins Finale teleportiert …
                  </ThemedText>
                </View>
              ) : null}
              <Button onPress={handleSubmit} iconText="arrow.right.circle">
                {submitting
                  ? "Wird geprüft…"
                  : isComplete
                  ? "Schlüssel einlösen"
                  : "Code eingeben"}
              </Button>
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
    left: 50,
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
    width: 200,
    bottom: 0,
    left: 0,
    top: 0,
    right: 0,
    position: "absolute",
  },
});
