import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { globalStyles } from "@/constants/styles";
import { useRouter } from "expo-router";

export default function HomeScreen() {
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
          <ThemedText type="title">Challenge 3</ThemedText>
          <ThemedText type="subtitle">Ihr sieht geil aus! 🔥</ThemedText>
          <ThemedText type="defaultSemiBold">
            Teilt lustige Fakten oder Storys von euch miteinander. Daraufhin
            muss jeder von euch beiden diese Fakten vor anderen Leuten kurz
            vorstellen. Es müssen mindestens 2 andere Leute als Zuhörer anwesend
            sein!
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <ThemedText>
            Macht ein Selfie zusammen und ladet es hier hoch!
          </ThemedText>
          <TouchableOpacity
            style={globalStyles.button}
            onPress={() => {
              router.navigate("/game/challenge_4");
            }}
          >
            <ThemedText> Erledigt Button </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
      <ThemedText style={styles.hintContainer}>
        PS: Schummeln ist für Loser, es geht hier um Spaß!
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
