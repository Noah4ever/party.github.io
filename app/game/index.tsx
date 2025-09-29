import { Image } from "expo-image";
import { Button, StyleSheet } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {
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
          Hinweise:
          <ul className="clueList">
            <li>Clue 1</li>
            <li>Clue 2</li>
          </ul>
        </ThemedText>
      </ThemedView>
      <ThemedView className="scan">
        <ThemedText type="normal">
          Wenn du glaubst, deine Person gefunden zu haben, dann scanner ihren QR
          Code
        </ThemedText>
        <ThemedText>
          <Button
            title="Scan"
            onPress={() => {
              /* Scan-Logik hier */
            }}
          />
        </ThemedText>
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
