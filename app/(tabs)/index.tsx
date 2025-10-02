import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { Link, useRouter } from "expo-router";

const GAME_STEPS = [
  { label: "Challenge 1 – Never Have I Ever", href: "/game" },
  { label: "Challenge 2 – Quiz Questions", href: "/game/challenge_2" },
  { label: "Challenge 3 – Funny Questions", href: "/game/challenge_3" },
  { label: "Challenge 4 – Passwords", href: "/game/challenge_4" },
  { label: "Final Challenge – Group Photo", href: "/game/challenge_5" },
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#FDE68A", dark: "#1F2937" }}
      headerImage={
        <View style={styles.partyHeader}>
          <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
          <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
          <Image source={require("@/assets/images/crown.png")} style={styles.partyCrown} contentFit="cover" />
          <View style={[styles.confetti, styles.confettiOne]} />
          <View style={[styles.confetti, styles.confettiTwo]} />
          <View style={[styles.confetti, styles.confettiThree]} />
          <View style={[styles.confetti, styles.confettiFour]} />
        </View>
      }
      headerHeight={180}>
      <ThemedView style={[styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ThemedText type="title" style={styles.heroTitle}>
          Party Central
        </ThemedText>
        <ThemedText style={styles.heroSubtitle}>Launch the festivities or hop into the control center.</ThemedText>
        <View style={styles.heroActions}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryAction, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/game")}>
            <IconSymbol name="play.circle.fill" size={22} color="#fff" />
            <ThemedText style={[styles.primaryActionText, { color: "#fff" }]}>Start the Game</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.secondaryAction, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}
            onPress={() => router.push("/admin")}>
            <IconSymbol name="settings" size={20} color={theme.icon} />
            <ThemedText style={[styles.secondaryActionText, { color: theme.text }]}>Admin Dashboard</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Development shortcuts
        </ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Current flow checkpoints</ThemedText>
        <View style={styles.stepList}>
          {GAME_STEPS.map((step) => (
            <Link
              key={step.href}
              href={step.href as any}
              style={[styles.stepLink, { backgroundColor: theme.backgroundAlt }]}>
              <View
                style={[
                  styles.stepIcon,
                  { backgroundColor: theme.primaryMuted, borderColor: theme.border, marginRight: 12 },
                ]}>
                <IconSymbol name="chevron.right" size={14} color={theme.primary} />
              </View>
              <ThemedText style={styles.stepText}>{step.label}</ThemedText>
            </Link>
          ))}
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  partyHeader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  partyGlow: {
    position: "absolute",
    borderRadius: 160,
    width: 260,
    height: 260,
    opacity: 0.55,
  },
  partyGlowPrimary: {
    backgroundColor: "rgba(236, 72, 153, 0.45)",
    transform: [{ scale: 1 }],
  },
  partyGlowSecondary: {
    backgroundColor: "rgba(59, 130, 246, 0.35)",
    width: 200,
    height: 200,
    borderRadius: 140,
    transform: [{ translateY: -20 }],
  },
  partyCrown: {
    width: 200,
    height: 150,
    marginTop: 10,
  },
  confetti: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
  },
  confettiOne: {
    height: 36,
    backgroundColor: "#F97316",
    top: 28,
    left: 50,
    transform: [{ rotate: "18deg" }],
  },
  confettiTwo: {
    height: 28,
    backgroundColor: "#6366F1",
    top: 24,
    right: 60,
    transform: [{ rotate: "-12deg" }],
  },
  confettiThree: {
    height: 22,
    backgroundColor: "#22C55E",
    bottom: 26,
    left: 90,
    transform: [{ rotate: "-28deg" }],
  },
  confettiFour: {
    height: 32,
    backgroundColor: "#FACC15",
    bottom: 18,
    right: 80,
    transform: [{ rotate: "24deg" }],
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  heroTitle: {
    fontSize: 32,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  heroActions: {
    gap: 12,
  },
  primaryAction: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: {
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryAction: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  stepList: {
    gap: 10,
  },
  stepLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBlock: 8,
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepText: {
    fontSize: 15,
    flexShrink: 1,
  },
});
