import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity } from "react-native";

import { HintBox } from "@/components/game/HintBox";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useTheme } from "@/constants/theme";
import { ApiError, gameApi } from "@/lib/api";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

//TODO: add questions
//TODO: add layout button
//TODO: add round with text and next button

export default function HomeScreen() {
  const router = useRouter();
  const globalStyles = useGlobalStyles();
  const theme = useTheme();
  const [counter, setCounter] = useState<number>(0);
  const [questions, setQuestions] = useState<String[]>([]);
  const [error, setError] = useState<String>();
  const [loading, setLoading] = useState<Boolean>(true);

  function incrementCounter() {
    setCounter(counter + 1);
  }

  const load = useCallback(async () => {
    try {
      const data = (await gameApi.getNHIE()) as String[];
      setQuestions(data);
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

  // counter updatet sich bei naechsten reload daher useEffect
  // wird durchgelaufen beim ersten draw und immer wenn sich die dependencies changen (counter)
  useEffect(() => {
    if (questions.length > 0 && counter >= questions.length) {
      router.navigate("/game/challenge_5");
    }
  }, [counter]);
  return (
    <ThemedView style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <Image
            source={require("@/assets/images/crown.png")}
            style={styles.papaLogo}
          />
        }
      >
        <ThemedView style={styles.textContainer}>
          <ThemedText type="title">Ich hab noch nie... 🍻</ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <ThemedView style={[styles.bubble, { borderColor: theme.primary }]}>
            <ThemedText type="subtitle">
              {/* //TODO: add styling */}
              {loading ? " loading..." : questions[counter]}
            </ThemedText>
          </ThemedView>
          <TouchableOpacity
            style={globalStyles.button}
            onPress={() => {
              incrementCounter();
            }}
          >
            <ThemedText style={globalStyles.buttonText}>Weiter</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
      <HintBox />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  },
  midContainer: {
    gap: 20,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  hintContainer: {
    padding: 20,
    textAlign: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bubble: {
    borderWidth: 4,
    borderRadius: "50%",
    width: 230,
    height: 230,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
  },
});
