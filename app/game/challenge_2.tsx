import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import { HintBox } from "@/components/game/HintBox";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCodeStyled from "react-native-qrcode-styled";

export default function ChallengeTwoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [guestId, setGuestId] = useState<string>("...");
  const [selfieStatus, setSelfieStatus] = useState<{ url: string; uploadedAt?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const storedGuestId = await AsyncStorage.getItem("guestId");
      if (storedGuestId) {
        setGuestId(storedGuestId);
      }
    })();
  }, []);

  const loadSelfieStatus = useCallback(async () => {
    const stored = await AsyncStorage.getItem("challenge2Selfie");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && typeof parsed.url === "string") {
          setSelfieStatus({
            url: parsed.url,
            uploadedAt: typeof parsed.uploadedAt === "string" ? parsed.uploadedAt : undefined,
          });
          return;
        }
      } catch (error) {
        console.warn("challenge2 selfie parse failed", error);
      }
    }
    setSelfieStatus(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSelfieStatus();
    }, [loadSelfieStatus])
  );

  const qrValue = useMemo(() => guestId ?? "", [guestId]);
  const selfieButtonLabel = selfieStatus ? "Selfie erneut aufnehmen" : "Selfie aufnehmen";
  const selfieUploadedAt = useMemo(() => {
    if (!selfieStatus?.uploadedAt) return null;
    try {
      const date = new Date(selfieStatus.uploadedAt);
      if (Number.isNaN(date.getTime())) return null;
      return date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [selfieStatus?.uploadedAt]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#FDE68A", dark: "#1F2937" }}
      headerHeight={180}
      headerImage={
        <View style={styles.partyHeader}>
          <View style={[styles.partyGlow, styles.partyGlowPink]} />
          <View style={[styles.partyGlow, styles.partyGlowBlue]} />
          <Image source={require("@/assets/images/crown.png")} style={styles.partyCrown} contentFit="contain" />
          <View style={[styles.confetti, styles.confettiOne]} />
          <View style={[styles.confetti, styles.confettiTwo]} />
          <View style={[styles.confetti, styles.confettiThree]} />
        </View>
      }>
      <ThemedView style={[styles.card, styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="subtitle" style={styles.sectionHeading}>
            Dein QR-Code
          </ThemedText>
          <IconSymbol name="qr-code" size={20} color={theme.primary} />
        </View>
        <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
          Nutzt euren Code weiterhin, um sicherzugehen, dass ihr beim nächsten Check-in bereit seid.
        </ThemedText>
        <View style={styles.qrWrapper}>
          <QRCodeStyled
            data={qrValue}
            size={225}
            isPiecesGlued={true}
            pieceBorderRadius={5}
            pieceLiquidRadius={2}
            color={theme.text}
            style={{ backgroundColor: theme.backgroundAlt }}
            errorCorrectionLevel="M"
          />
          <ThemedText style={[styles.qrHint, { color: theme.textMuted }]}>Deine Guest-Id: {qrValue}</ThemedText>
        </View>
      </ThemedView>

      <ThemedView
        style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}
        testID="challenge-two-hero-card">
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.titleText}>
            Challenge 2: Selfie-Time!
          </ThemedText>
          <HelloWave />
        </View>
        <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
          Ihr seid ein Team! Haltet euren Moment fest und ladet ein Selfie hoch, damit wir sehen, dass ihr zusammen
          unterwegs seid.
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: theme.backgroundAlt, borderColor: theme.border, gap: 8 }]}>
          <IconSymbol name="camera.viewfinder" size={18} color={theme.primary} />
          <ThemedText style={[styles.statusBadgeLabel, { color: theme.textMuted }]}>
            Nur noch ein Selfie bis Challenge 3
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="subtitle" style={styles.sectionHeading}>
            Selfie aufnehmen
          </ThemedText>
          <IconSymbol name="camera" size={20} color={theme.primary} />
        </View>
        <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
          Bitte macht gemeinsam ein Selfie und ladet es hoch. Falls das Licht schlecht ist, ihr könnt jederzeit neu
          aufnehmen. Das Foto wird nur für das Event gespeichert.
        </ThemedText>
        {selfieStatus ? (
          <View
            style={[styles.selfieStatusBanner, { backgroundColor: theme.backgroundAlt, borderColor: theme.success }]}>
            <IconSymbol name="checkmark.circle" size={24} color={theme.success} />
            <View style={styles.selfieStatusTextWrapper}>
              <ThemedText style={[styles.selfieStatusTitle, { color: theme.success }]}>Selfie gespeichert!</ThemedText>
              <ThemedText style={[styles.selfieStatusMeta, { color: theme.textMuted }]}>
                {selfieUploadedAt
                  ? `Zuletzt aktualisiert um ${selfieUploadedAt} Uhr`
                  : "Ihr könnt jederzeit ein neues Foto machen."}
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText style={[styles.selfieStatusMeta, { color: theme.textMuted }]}>
            Noch kein Selfie hochgeladen – ihr könnt loslegen, sobald ihr bereit seid.
          </ThemedText>
        )}
        <View style={styles.actionsRow}>
          <Button onPress={() => router.navigate("/game/modal/selfie")} iconText="camera">
            {selfieButtonLabel}
          </Button>
        </View>
      </ThemedView>

      <HintBox>Hinweis: Ab jetzt reicht ein Handy – koordiniert euch und bleibt kreativ!</HintBox>
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
    borderRadius: 200,
    width: 260,
    height: 260,
    opacity: 0.55,
  },
  partyGlowPink: {
    backgroundColor: "rgba(236,72,153,0.4)",
    transform: [{ translateX: -30 }],
  },
  partyGlowBlue: {
    backgroundColor: "rgba(59,130,246,0.35)",
    transform: [{ translateX: 60 }, { translateY: 20 }],
  },
  partyCrown: {
    width: 210,
    height: 150,
  },
  confetti: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
  },
  confettiOne: {
    height: 34,
    backgroundColor: "#F59E0B",
    top: 30,
    left: 60,
    transform: [{ rotate: "18deg" }],
  },
  confettiTwo: {
    height: 26,
    backgroundColor: "#22C55E",
    top: 40,
    right: 70,
    transform: [{ rotate: "-16deg" }],
  },
  confettiThree: {
    height: 30,
    backgroundColor: "#8B5CF6",
    bottom: 30,
    right: 90,
    transform: [{ rotate: "32deg" }],
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 16,
    marginHorizontal: 0,
    marginBottom: 0,
    width: "100%",
    alignSelf: "center",
    maxWidth: 720,
  },
  heroCard: {
    gap: 18,
    marginTop: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleText: {
    flex: 1,
  },
  leadText: {
    fontSize: 16,
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontSize: 18,
  },
  sectionIntro: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: {
    alignItems: "stretch",
  },
  qrWrapper: {
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  qrHint: {
    textAlign: "center",
    fontSize: 14,
  },
  selfieStatusBanner: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selfieStatusTextWrapper: {
    flex: 1,
    gap: 4,
  },
  selfieStatusTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  selfieStatusMeta: {
    fontSize: 14,
    lineHeight: 20,
  },
});
