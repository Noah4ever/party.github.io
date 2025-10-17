import { Image } from "expo-image";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { Button } from "@/components/game/Button";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isCompactLayout =
    width < 720 || Platform.OS === "ios" || Platform.OS === "android";

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#FDE68A", dark: "#1F2937" }}
      headerImage={
        <View style={styles.partyHeader}>
          <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
          <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
          <Image
            source={require("@/assets/images/crown.png")}
            style={styles.partyCrown}
            contentFit="cover"
          />
          <View style={[styles.confetti, styles.confettiOne]} />
          <View style={[styles.confetti, styles.confettiTwo]} />
          <View style={[styles.confetti, styles.confettiThree]} />
          <View style={[styles.confetti, styles.confettiFour]} />
        </View>
      }
      headerHeight={180}
    >
      <ThemedView
        style={[
          styles.heroCard,
          { borderColor: theme.border, backgroundColor: theme.card },
        ]}
      >
        <ThemedText type="title" style={styles.heroTitle}>
          Party Hub
        </ThemedText>
        <ThemedText style={styles.heroSubtitle}>
          Eure Erinnerungen. Eure Momente. Ein gemeinsamer Abend.
        </ThemedText>
        <View style={styles.heroActions}>
          <Button
            onPress={() => router.navigate("/game")}
            iconText="play.circle.fill"
          >
            Start the Game!
          </Button>
        </View>
      </ThemedView>

      <ThemedView
        style={[
          styles.sectionCard,
          { borderColor: theme.border, backgroundColor: theme.card },
        ]}
      >
        <View
          style={[
            styles.shortcutsContainer,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundAlt,
              flexDirection: isCompactLayout ? "column" : "row",
              alignItems: isCompactLayout ? "stretch" : "center",
              gap: isCompactLayout ? 16 : 20,
            },
          ]}
        >
          <View
            style={[
              styles.shortcutsIconWrapper,
              {
                backgroundColor: theme.primaryMuted,
                borderColor: theme.border,
                alignSelf: isCompactLayout ? "center" : "flex-start",
              },
            ]}
          >
            <IconSymbol name="images.outline" size={48} color={theme.primary} />
          </View>
          <View
            style={[
              styles.shortcutsContent,
              isCompactLayout && styles.shortcutsContentCompact,
            ]}
          >
            <ThemedText
              style={[styles.shortcutsHeading, { color: theme.text }]}
            >
              Galerie
            </ThemedText>
            <ThemedText
              style={[
                styles.shortcutsBody,
                { color: theme.textMuted },
                isCompactLayout && styles.shortcutsBodyCompact,
              ]}
            >
              Entdeckt alle geteilten Fotos & Videos und ladet neue Erinnerungen
              hoch.
            </ThemedText>
            <Button
              onPress={() => router.push("/gallery")}
              iconText="photo.on.rectangle"
              style={[
                styles.shortcutsButton,
                isCompactLayout && styles.shortcutsButtonCompact,
              ]}
            >
              Zur Galerie
            </Button>
            <Button
              onPress={() => router.push("/game/questionary-answers")}
              iconText="chatbox.ellipses.outline"
              style={[
                styles.shortcutsButton,
                isCompactLayout && styles.shortcutsButtonCompact,
              ]}
            >
              Zu den Antworten
            </Button>
          </View>
        </View>
      </ThemedView>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.push("/admin")}
        style={styles.footerAdminLink}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <IconSymbol name="settings" size={16} color={theme.icon} />
        <ThemedText
          style={[styles.footerAdminText, { color: theme.textMuted }]}
        >
          Admin
        </ThemedText>
      </TouchableOpacity>
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
  shortcutsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  shortcutsIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutsContent: {
    flex: 1,
    gap: 12,
  },
  shortcutsContentCompact: {
    alignItems: "center",
  },
  shortcutsHeading: {
    fontSize: 18,
    fontWeight: "700",
  },
  shortcutsBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  shortcutsBodyCompact: {
    textAlign: "center",
  },
  shortcutsButton: {
    alignSelf: "flex-start",
    minWidth: 220,
  },
  shortcutsButtonCompact: {
    alignSelf: "stretch",
    minWidth: undefined,
  },
  footerAdminLink: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingTop: 24,
    opacity: 0.6,
  },
  footerAdminText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
