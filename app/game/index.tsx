import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { Link } from "expo-router";
import React from "react";
//TODO: fix picture
//TODO: change colors
//TODO: add clue logic
//TODO: add scan logic and qr logic
//TODO: add timer logic

export default function HomeScreen() {
  const theme = useTheme();
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/crown.png")}
          style={styles.papaLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">
          Wilkommen zu Ronalds Kennlernspiel!
        </ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.textContainer}>
        <ThemedText type="subtitle">
          In mehreren Schritten wirst du eine bestimmte Person auf dieser Party
          durch mehrere Steps kennenlernen. Schafft ihr beide alle challenges
          kommt ihr ins Finale Trinkspiel und könnt was cooles gewinnen!
        </ThemedText>
      </ThemedView>
      <ThemedView>
        <ThemedText type="normal">Challenge 1 : Finde deine Person</ThemedText>
        <ThemedText type="normal" style={styles.clueBox}>
          Hinweise: Clue Clue
        </ThemedText>
      </ThemedView>
      <ThemedView className="scan">
        <ThemedText type="normal">
          Wenn du glaubst, deine Person gefunden zu haben, dann scanner ihren QR
          Code
        </ThemedText>
        <Link style={{ paddingTop: 50 }} href={"/game/modal/camera"}>
          <ThemedText
            style={{
              color: theme.primary,
              textAlign: "center",
              paddingTop: 10,
            }}
          >
            Scanne den QR Code
          </ThemedText>
        </Link>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clueBox: {
    // border
  },
  textContainer: {
    top: 10,
    marginBottom: 10,
  },
  papaLogo: {
    height: 180,
    width: 290,
    bottom: 0,
    top: 0,
    right: 0,
    position: "absolute",
  },
});
