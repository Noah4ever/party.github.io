import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/constants/theme";
import { ApiError, gameApi, NeverHaveIEverPackDTO } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";

//TODO: ASH add questions 

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [counter, setCounter] = useState<number>(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);

  const animate = useRef(new Animated.Value(1)).current;
  const completionTriggeredRef = useRef(false);

  const incrementCounter = useCallback(() => {
    if (completionSubmitting) {
      return;
    }
    setCounter((prev) => prev + 1);
  }, [completionSubmitting]);

  const load = useCallback(async () => {
    try {
      const data = (await gameApi.getNHIE()) as NeverHaveIEverPackDTO[];
      setQuestions(data[0].statements);
      setError(undefined);
      setCounter(0);
      completionTriggeredRef.current = false;
      console.log(data);
    } catch (e) {
      setError((e as ApiError).message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    (async () => {
      try {
        const storedGroupId = await AsyncStorage.getItem("groupId");
        if (storedGroupId) {
          setGroupId(storedGroupId);
        }
      } catch (err) {
        console.warn("NeverHaveIEver groupId load failed", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!completionTriggeredRef.current && questions.length > 0 && counter >= questions.length) {
      completionTriggeredRef.current = true;
      setCompletionSubmitting(true);

      (async () => {
        try {
          if (groupId) {
            await gameApi.recordProgress(groupId, "challenge-4-never-have-i-ever");
          }
          router.navigate("/game/challenge_3");
        } catch (err) {
          console.error("NHIE progress update failed", err);
          showAlert({
            title: "Speichern fehlgeschlagen",
            message: "Euer Fortschritt konnte nicht gespeichert werden. Versucht es bitte erneut.",
          });
          completionTriggeredRef.current = false;
        } finally {
          setCompletionSubmitting(false);
        }
      })();
    }
  }, [counter, groupId, questions.length, router]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animate, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(animate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
      ])
    ).start();
  }, [animate]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <View style={styles.partyHeader}>
          <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
          <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
          <Image source={require("@/assets/images/Hummel/HummelPool.png")} style={styles.papaLogo} />
          <View style={[styles.confetti, styles.confettiOne]} />
          <View style={[styles.confetti, styles.confettiTwo]} />
          <View style={[styles.confetti, styles.confettiThree]} />
          <View style={[styles.confetti, styles.confettiFour]} />
        </View>
      }>
      <View style={[styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ThemedText type="title">Ich hab noch nie... 🍻</ThemedText>
        <View style={styles.textContainer}></View>

        <View style={styles.midContainer}>
          <Animated.View style={[styles.bubble, { borderColor: theme.primary, transform: [{ scale: animate }] }]}>
            <ThemedText type="subtitle">
              {loading
                ? " loading..."
                : completionSubmitting
                ? "Challenge wird abgeschlossen…"
                : error
                ? error
                : questions[counter] ?? "Keine weiteren Fragen"}
            </ThemedText>
          </Animated.View>
          <View>
            <Button onPress={() => incrementCounter()} iconText="arrow.right.circle">
              Weiter
            </Button>
          </View>
        </View>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#f200ff",
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
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
    height: 190,
    width: 200,
    bottom: 0,
    left: 20,
    top: 0,
    right: 0,
    position: "absolute",
  },
  textContainer: {
    gap: 20,
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "#4c1fffff",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  midContainer: {
    gap: 35,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    borderWidth: 4,
    borderRadius: 999,
    width: 230,
    height: 230,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4c1fffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 10,
  },
});
