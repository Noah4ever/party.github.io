import { Image } from "expo-image";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";


export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#FDE68A", dark: "#1F2937" }}
        headerHeight={180}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image
              source={require("@/assets/images/papa/sunny.png")}
              style={styles.papaLogo}
            />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
            <View style={[styles.confetti, styles.confettiFour]} />
          </View>
        }
      >
        {/* ✨ Challenge Card animiert */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <ThemedView
            style={[
              styles.textContainer,
              styles.card,
              { borderColor: theme.border, backgroundColor: theme.card },
            ]}
          >
            <ThemedText type="title">Klo Malerei 🎨</ThemedText>
            <ThemedText
              style={[styles.bodyText, { color: theme.textSecondary }]}
            >
              Geht auf Klo und schreibt zusammen etwas Lustiges an die Wand. Macht
              anschließend direkt hier auf der Website ein Foto davon – einfach auf
              den „Foto aufnehmen“-Button klicken.
            </ThemedText>
          </ThemedView>

          <ThemedView
            style={[
              styles.card,
              { borderColor: theme.border, backgroundColor: theme.card },
            ]}
          >
            <ThemedText style={[styles.bodyText, { color: theme.textMuted }]}>
              Macht hier ein Foto von eurem Kunstwerk.
            </ThemedText>
            <Button
              onPress={() => router.navigate("/game/modal/kloSelfie")}
              iconText="camera"
            >
              Foto machen
            </Button>
          </ThemedView>
        </Animated.View>
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
