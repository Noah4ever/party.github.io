import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import { PopupModal } from "@/components/game/hint";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Collapsible } from "@/components/ui/collapsible";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCodeStyled from "react-native-qrcode-styled";

export default function ChallengeTwoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [guestId, setGuestId] = useState<string>("...");
  const [selfieStatus, setSelfieStatus] = useState<{
    url: string;
    uploadedAt?: string;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setModalVisible(true);
  }, []);
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
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.url === "string"
        ) {
          setSelfieStatus({
            url: parsed.url,
            uploadedAt:
              typeof parsed.uploadedAt === "string"
                ? parsed.uploadedAt
                : undefined,
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
  const selfieButtonLabel = selfieStatus
    ? "Selfie erneut aufnehmen"
    : "Selfie aufnehmen";
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
    <ThemedView style={{ flex: 1 }}>
      <PopupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="🎉 Yippie ihr habt euch gefunden!"
        content="Hinweis: Ab diesem Zeitpunkt braucht ihr beiden nur noch ein Handy!"
      />
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image
              source={require("@/assets/images/papa/melon_hat.png")}
              style={styles.papaLogo}
            />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
            <View style={[styles.confetti, styles.confettiFour]} />
          </View>
        }
      >
        <ThemedView
          style={[
            styles.card,
            styles.heroCard,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle" style={styles.sectionHeading}>
              Dein QR-Code
            </ThemedText>
            <IconSymbol name="qr-code" size={20} color={theme.primary} />
          </View>

          <ThemedText
            style={[styles.sectionIntro, { color: theme.textSecondary }]}
          >
            {/* TODO: kann das raus? */}
            Nutze den Button unten, um deinen persönlichen QR-Code anzuzeigen, falls du ihn noch brauchst.
          </ThemedText>

          <Collapsible title="QR-Code anzeigen">
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
              <ThemedText style={[styles.qrHint, { color: theme.textMuted }]}>
                Deine Guest-Id: {qrValue}
              </ThemedText>
            </View>
          </Collapsible>
        </ThemedView>

        <ThemedView
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
          testID="challenge-two-hero-card"
        >
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>
              Challenge 2: Selfie-Time!
            </ThemedText>
            <HelloWave />
          </View>
          <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
            Ihr seid ein Team! Haltet euren Moment fest und ladet ein Selfie
            hoch, damit wir sehen, dass ihr zusammen unterwegs seid.
          </ThemedText>
        </ThemedView>

        <ThemedView
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle" style={styles.sectionHeading}>
              Selfie aufnehmen
            </ThemedText>
            <IconSymbol name="camera" size={20} color={theme.primary} />
          </View>
          <ThemedText
            style={[styles.sectionIntro, { color: theme.textSecondary }]}
          >
            📸 Bitte macht gemeinsam ein Selfie direkt hier auf der Website.
Nutzt dafür einfach den „Selfie aufnehmen“-Button unten.
Wenn das Licht nicht passt oder euch das Bild nicht gefällt, könnt ihr es jederzeit neu machen.
          </ThemedText>
          {selfieStatus ? (
            <View
              style={[
                styles.selfieStatusBanner,
                {
                  backgroundColor: theme.backgroundAlt,
                  borderColor: theme.success,
                },
              ]}
            >
              <IconSymbol
                name="checkmark.circle"
                size={24}
                color={theme.success}
              />
              <View style={styles.selfieStatusTextWrapper}>
                <ThemedText
                  style={[styles.selfieStatusTitle, { color: theme.success }]}
                >
                  Selfie gespeichert!
                </ThemedText>
                <ThemedText
                  style={[styles.selfieStatusMeta, { color: theme.textMuted }]}
                >
                  {selfieUploadedAt
                    ? `Zuletzt aktualisiert um ${selfieUploadedAt} Uhr`
                    : "Ihr könnt jederzeit ein neues Foto machen."}
                </ThemedText>
              </View>
            </View>
          ) : (
            <ThemedText
              style={[styles.selfieStatusMeta, { color: theme.textMuted }]}
            >
              Noch kein Selfie hochgeladen – ihr könnt loslegen, sobald ihr
              bereit seid.
            </ThemedText>
          )}
          <View style={styles.actionsRow}>
            <Button
              onPress={() => router.navigate("/game/modal/selfie")}
              iconText="camera"
            >
              {selfieButtonLabel}
            </Button>
          </View>
        </ThemedView>
      </ParallaxScrollView>
    </ThemedView>
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
    left: 0,
  },
  partyGlowSecondary: {
    backgroundColor: "rgba(59, 130, 246, 0.35)",
    width: 200,
    height: 200,
    borderRadius: 140,
    left: 0,
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
    left: 190,
    transform: [{ rotate: "-28deg" }],
  },
  confettiFour: {
    height: 32,
    backgroundColor: "#FACC15",
    bottom: 18,
    right: 80,
    transform: [{ rotate: "24deg" }],
  },
  papaLogo: {
    height: 180,
    width: 400,
    bottom: 0,
    left: -100,
    top: 0,
    position: "absolute",
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
