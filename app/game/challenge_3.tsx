import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import { PopupModal } from "@/components/game/hint";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

//TODO: ASH maybe get signature

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setModalVisible(true);
  }, []);

  return (
    <ThemedView style={{ flex: 1 }}>
      <PopupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="🎉 Willkommen!"
        content="PS: Schummeln ist für Loser, es geht hier um Spaß!"
      />
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#FDE68A", dark: "#1F2937" }}
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
        <ThemedView style={[styles.card, styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="title">Challenge 3</ThemedText>
          <ThemedText type="subtitle">Ihr sieht geil aus! 🔥</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
            Teilt lustige Fakten oder Storys von euch miteinander. Danach stellt jede*r von euch mindestens zwei Fakten
            kurz vor anderen Leuten vor – es müssen mindestens zwei Zuhörer dabei sein!
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText style={[styles.bodyText, { color: theme.textMuted }]}>
            Markiert die Challenge als erledigt, sobald ihr eure Stories präsentiert habt.
          </ThemedText>
          <Button onPress={() => router.navigate("/game/challenge_4")} iconText="checkmark.circle.outline">
            Erledigt!
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
