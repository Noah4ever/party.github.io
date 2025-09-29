import { Image } from "expo-image";
import { Button, StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {
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
          <ThemedText type="title">Challenge 2</ThemedText>
          <ThemedText type="defaultSemiBold">
            Treffer! Du hast deinen Partner gefunden Jetzt gehts weiter mit den
            Challenges!
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <ThemedText>
            Macht ein Selfie zusammen und ladet es hier hoch!
          </ThemedText>
          <Button
            title="Scan"
            onPress={() => {
              /* Scan-Logik hier */
            }}
          />
        </ThemedView>
      </ParallaxScrollView>
      <ThemedText style={styles.hintContainer}>
        Hinweis: Ab diesem Zeitpunkt braucht ihr beiden nur noch ein Handy!
      </ThemedText>
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
