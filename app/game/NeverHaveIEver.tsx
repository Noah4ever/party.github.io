import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { useGlobalStyles } from "@/constants/styles";
import { useTheme } from "@/constants/theme";
import { ApiError, gameApi, NeverHaveIEverPackDTO } from "@/lib/api";
import { useFocusEffect, useRouter } from "expo-router";

//TODO: ASH add questions

export default function HomeScreen() {
  const router = useRouter();
  const globalStyles = useGlobalStyles();
  const theme = useTheme();
  const [counter, setCounter] = useState<number>(0);
  const [questions, setQuestions] = useState<String[]>([]);
  const [error, setError] = useState<String>();
  const [loading, setLoading] = useState<Boolean>(true);

  const animate = useRef(new Animated.Value(1)).current;

  function incrementCounter() {
    setCounter(counter + 1);
  }

  const load = useCallback(async () => {
    try {
      const data = (await gameApi.getNHIE()) as NeverHaveIEverPackDTO[];
      setQuestions(data[0].statements);
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
    if (questions.length > 0 && counter >= questions.length) {
      router.navigate("/game/questions");
    }
  }, [counter]);

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
  }, []);

  return (
    <ParallaxScrollView
      headerHeight={180}
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/crown.png")}
          style={styles.papaLogo}
        />
      }
    >
      <View
        style={[
          styles.heroCard,
          { borderColor: theme.border, backgroundColor: theme.card },
        ]}
      >
        <ThemedText type="title">Ich hab noch nie... 🍻</ThemedText>
        <View style={styles.textContainer}></View>

        <View style={styles.midContainer}>
          <Animated.View
            style={[
              styles.bubble,
              { borderColor: theme.primary, transform: [{ scale: animate }] },
            ]}
          >
            <ThemedText type="subtitle">
              {loading ? " loading..." : questions[counter]}
            </ThemedText>
          </Animated.View>
          <View>
            <Button
              onPress={() => incrementCounter()}
              iconText="arrow.right.circle"
            >
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
  papaLogo: {
    height: 180,
    width: 290,
    bottom: 0,
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
