import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { gameApi } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

//TODO: NOAH add route and function to upload photo

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedGroupId = await AsyncStorage.getItem("groupId");
        if (storedGroupId) {
          setGroupId(storedGroupId);
        }
      } catch (err) {
        console.warn("challenge_3 groupId load failed", err);
      }
    })();
  }, []);

  const buttonLabel = useMemo(() => (submitting ? "Wird gespeichert…" : "Erledigt!"), [submitting]);

  const handleComplete = useCallback(async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      if (groupId) {
        await gameApi.recordProgress(groupId, "challenge-3-story-share");
      }
      router.push("/game/questions");
    } catch (error) {
      console.error("challenge_3 progress update failed", error);
      showAlert({
        title: "Speichern fehlgeschlagen",
        message: "Wir konnten euren Fortschritt nicht sichern. Versucht es bitte noch einmal.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [groupId, router, submitting]);

  return (
    <ThemedView style={{ flex: 1 }}>
      
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#FDE68A", dark: "#1F2937" }}
        headerHeight={180}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image source={require("@/assets/images/papa/sunny.png")} style={styles.papaLogo} />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
            <View style={[styles.confetti, styles.confettiFour]} />
          </View>
        }>
        <ThemedView
          style={[styles.textContainer, styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="title">Klo Malerei🎨</ThemedText>
          <ThemedText type="subtitle">Ihr sieht geil aus! 🔥</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            Geht auf Klo und schreibt zusammen etwas lustiges an die Wand und ladet davon ein Foto hoch!
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText style={[styles.bodyText, { color: theme.textMuted }]}>
            Macht hier ein Foto von eurem Kunstwerk.
          </ThemedText>
          <Button onPress={handleComplete} iconText="camera">
            Foto machen
          </Button>
        </ThemedView>
      </ParallaxScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    height: 190,
    width: 230,
    bottom: 0,
    left: 40,
    top: 0,
    right: 0,
    position: "absolute",
    borderRadius: 200,
  },

  textContainer: {
    gap: 15,
  },
  partyGlowPink: {
    backgroundColor: "rgba(236,72,153,0.4)",
    transform: [{ translateX: -30 }],
  },
  partyGlowBlue: {
    backgroundColor: "rgba(59,130,246,0.35)",
    transform: [{ translateX: 60 }, { translateY: 20 }],
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 16,
  },
  heroCard: {
    gap: 18,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
  },
});
