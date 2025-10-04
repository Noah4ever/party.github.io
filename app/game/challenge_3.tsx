import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import { PopupModal } from "@/components/game/hint";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

//TODO: ASH maybe get signature

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
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
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image
              source={require("@/assets/images/papa/crown.png")}
              style={styles.papaLogo}
            />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
            <View style={[styles.confetti, styles.confettiFour]} />
          </View>
        }
      >
        <ThemedView style={styles.textContainer}>
          <ThemedText type="title">Challenge 3</ThemedText>
          <ThemedText type="subtitle">Ihr sieht geil aus! 🔥</ThemedText>
          <ThemedText type="defaultSemiBold">
            Teilt lustige Fakten oder Storys von euch miteinander. Daraufhin
            muss jeder von euch beiden diese Fakten vor anderen Leuten kurz
            vorstellen. Es müssen mindestens 2 andere Leute als Zuhörer anwesend
            sein!
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <ThemedText></ThemedText>
          <Button
            onPress={() => router.navigate("/game/challenge_4")}
            iconText="checkmark.circle.outline"
          >
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
    height: 280,
    width: 230,
    bottom: 0,
    left: 0,
    top: 0,
    right: 0,
    position: "absolute",
  },
  textContainer: {
    gap: 20,
  },
  midContainer: {
    gap: 20,
    padding: 20,
  },
});
