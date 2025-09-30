import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

//TODO: add game logic and add questions
//TODO: add layout button
//TODO: add round with text and next button

export default function HomeScreen() {
  const router = useRouter();
  const globalStyles = useGlobalStyles();
  const [counter, setCounter] = useState<number>(0);
  const question = ["Penis", "Vagina", "Test"];

  function incrementCounter() {
    setCounter(counter + 1);
  }

  // counter updatet sich bei naechsten reload daher useEffect
  // wird durchgelaufen beim ersten draw und immer wenn sich die dependencies changen (counter)
  useEffect(() => {
    if (counter >= 3) {
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
          <ThemedText type="title">Ich hab noch nie! 🍻</ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <ThemedText style={styles.bubble}>blablabla  {question[counter]}  rundr</ThemedText>
          <TouchableOpacity
            style={globalStyles.button}
            onPress={() => {
              incrementCounter();
            }}
          >
            <ThemedText style={globalStyles.buttonText}>
              Weiter
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
      <ThemedView>
        <ThemedText style={styles.hintContainer}>
          PS: Schummeln ist für Loser, es geht hier um Spaß!
        </ThemedText>
      </ThemedView>
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
  },
  hintContainer: {
    padding: 20,
    textAlign: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bubble: {},
});
