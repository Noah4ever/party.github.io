import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useRouter } from "expo-router";
import { useState } from "react";

//TODO: NOAH add timer logic and animation confetti

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [text, setText] = useState("");

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
          <ThemedText type="title">Du hast es ins Finale geschafft!</ThemedText>
          <ThemedText type="defaultSemiBold">Eure Zeit: 00:00</ThemedText>
          <ThemedText>
            Ihr seid unter den Top 4 schnellsten Paaren und seid somit im
            Finale. Sobald die Finalsten fest stehen, müsst ihr in Trinkspielen
            gegen die anderen antreten um etwas zu gewinnen. Weitere Anweisungen
            erhaltet ihr vom Geburstagskind!
          </ThemedText>
        </ThemedView>
      </ParallaxScrollView>
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
});
