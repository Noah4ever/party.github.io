import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import { PopupModal } from "@/components/game/hint";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

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
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image
              source={require("@/assets/images/papa/pool.png")}
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
            styles.textContainer,
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <ThemedText type="title">Ich hab noch nie! 🍻</ThemedText>
          <ThemedText type="subtitle">Schnappt euch zwei Drinks eurer Wahl (Shots empfohlen 🍸)</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.textSecondary }]}>
      Das Spiel zeigt euch einen
            Satz – wenn er auf euch zutrifft, trinkt ihr.
          </ThemedText>
        </ThemedView>

        <ThemedView
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <ThemedText style={[styles.bodyText, { color: theme.textMuted }]}>
            Drückt auf Starten, sobald ihr bereit seid, eurem Gegenüber ein paar
            Geheimnisse zu entlocken.
          </ThemedText>
          <Button
            onPress={() => router.navigate("/game/NeverHaveIEver")}
            iconText="arrow.right.circle"
          >
            Starten!
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
    height: 250,
    width: 230,
    bottom: 0,
    left: 0,
    top: 0,
    right: 0,
    position: "absolute",
    borderRadius: 200,
  },
  partyGlowPink: {
    backgroundColor: "rgba(236,72,153,0.4)",
    transform: [{ translateX: -30 }],
  },
  partyGlowBlue: {
    backgroundColor: "rgba(59,130,246,0.35)",
    transform: [{ translateX: 60 }, { translateY: 20 }],
  },
  textContainer: {
    gap: 15,
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
