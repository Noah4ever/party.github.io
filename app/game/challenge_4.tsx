import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
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
          <ThemedText type="title">Challenge 4</ThemedText>
          <ThemedText type="subtitle">Ich hab noch nie! 🍻</ThemedText>
          <ThemedText type="defaultSemiBold">
            Holt euch beide shots oder andere Getränke, am besten mit Alkohol
            und spielt ich hab noch nie!
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <ThemedText>Drückt auf Starten wenn ihr ready seid</ThemedText>
          <TouchableOpacity
            style={globalStyles.button}
            onPress={() => {
              router.navigate("/game/NeverHaveIEver");
            }}
          >
            <ThemedText style={globalStyles.buttonText}>
              {" "}
              Starten Button{" "}
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
});
