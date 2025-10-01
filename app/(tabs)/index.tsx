import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={<Image source={require("@/assets/images/partial-react-logo.png")} style={styles.reactLogo} />}>
      <ThemedView>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Welcome!</ThemedText>
          <HelloWave />
        </ThemedView>
        {/* Links for admin, and each game (game/index game/challenge_2 game/challenge_3 game/challenge_4 game/challenge_5 game/final) */}
        <ThemedView style={styles.mainContainer}>
          <Link href="/admin" style={styles.linkItem}>
            <ThemedText style={styles.linkText}>Go to Admin Panel</ThemedText>
          </Link>
          <Link href="/game" style={styles.linkItem}>
            <ThemedText style={styles.linkText}>Start Game</ThemedText>
          </Link>
          <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">Game Steps:</ThemedText>
            <Link href="/game" style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Challenge 1 - Never Have I Ever</ThemedText>
            </Link>
            <Link href="/game/challenge_2" style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Challenge 2 - Quiz Questions</ThemedText>
            </Link>
            <Link href="/game/challenge_3" style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Challenge 3 - Funny Questions</ThemedText>
            </Link>
            <Link href="/game/challenge_4" style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Challenge 4 - Passwords</ThemedText>
            </Link>
            <Link href="/game/challenge_5" style={styles.linkItem}>
              <ThemedText style={styles.linkText}>Final Challenge - Group Photo</ThemedText>
            </Link>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  mainContainer: {
    flexDirection: "column",
    gap: 12,
    marginTop: 20,
  },
  linkItem: {
    display: "flex",
  },
  linkText: {
    fontSize: 18,
    color: "#1E90FF",
  },
});
