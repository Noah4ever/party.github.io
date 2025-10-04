import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useGameStateSubscription } from "@/hooks/use-game-state";
import { gameApi, guestsApi } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import QRCodeStyled from "react-native-qrcode-styled";

//TODO: ASHLI fix picture
//TODO: TG change colors

export default function HomeScreen() {
  const theme = useTheme();
  const { started, connected, cluesUnlockedAt } = useGameStateSubscription();
  const router = useRouter();
  const local = useLocalSearchParams();
  const [guestId, setGuestId] = useState("error");
  const [clues, setClues] = useState<string[]>();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (local.guestId && !Array.isArray(local.guestId)) {
      AsyncStorage.setItem("guestId", local.guestId);
      setGuestId(local.guestId);
      guestsApi.get(local.guestId).then((data) => {
        if (data && "name" in data && data.name) {
          setName(data.name);
        }
      });
    } else if (!local.guestId) {
      (async () => {
        const storedGuestId = await AsyncStorage.getItem("guestId");
        if (storedGuestId) {
          setGuestId(storedGuestId);
          guestsApi.get(storedGuestId).then((data) => {
            if (data && "name" in data && data.name) {
              setName(data.name);
            }
          });
        }
      })();
    }
  }, [local.guestId]);

  useEffect(() => {
    if (started && guestId) {
      (async () => {
        const storedGuestId = await AsyncStorage.getItem("guestId");
        if (storedGuestId) {
          setGuestId(storedGuestId);
          const data = await gameApi.getPartnerClues(storedGuestId);
          if ("clues" in data && data.clues) {
            setClues(data.clues);
          }
        }
      })();
    } else if (!started) {
      setClues(undefined);
    }
  }, [started, guestId]);

  const statusMessage = useMemo(() => {
    if (!connected) {
      return "Wir stellen die Verbindung her – bleib kurz dran.";
    }
    if (!started) {
      return "Wir benachrichtigen dich automatisch, sobald das Spiel beginnt.";
    }
    if (cluesUnlockedAt) {
      return `Hinweise wurden um ${new Date(cluesUnlockedAt).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })} Uhr freigeschaltet.`;
    }
    return "Hinweise sind freigegeben. Schau dir die Liste unten an.";
  }, [connected, started, cluesUnlockedAt]);

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
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.titleText}>
            Hey, {name}!
            <HelloWave />
          </ThemedText>
          <ThemedText type="subtitle" style={styles.titleText}>
            Willkommen zum Kennlernspiel!
          </ThemedText>
        </View>
        <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
          Finde deine geheime Party-Person durch Hinweise, Challenges und Teamwork. Wenn ihr alle Aufgaben schnell löst,
          wartet das Finale mit einem besonderen Preis auf euch.
        </ThemedText>
        <View
          style={[
            styles.statusBadge,
            started ? { backgroundColor: theme.success, borderColor: theme.success } : styles.statusBadgeWaiting,
          ]}>
          <IconSymbol
            name={started ? "checkmark.circle" : "ellipsis.vertical.circle"}
            size={16}
            color={started ? "#16A34A" : theme.textMuted}
          />
          <ThemedText style={[styles.statusBadgeLabel, { color: started ? "#14532D" : theme.textMuted }]}>
            {started ? "Das Spiel läuft!" : "Warte bis das Spiel startet"}
          </ThemedText>
        </View>
        <ThemedText style={[styles.statusMessage, { color: theme.textMuted }]}>{statusMessage}</ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="subtitle" style={styles.sectionHeading}>
            Deine Mission
          </ThemedText>
          <IconSymbol name="gamecontroller.fill" size={20} color={theme.primary} />
        </View>
        <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
          Challenge 1: Finde die Person, zu der deine Hinweise passen. Tauscht euch aus, sammelt Hinweise und haltet den
          QR-Code bereit, sobald du glaubst, sie gefunden zu haben.
        </ThemedText>
        <View style={[styles.clueCard, { backgroundColor: theme.backgroundAlt, borderColor: theme.border }]}>
          <ThemedText style={[styles.clueTitle, { color: theme.textMuted }]}>Hinweise</ThemedText>
          {started ? (
            clues?.length ? (
              <View style={styles.clueList}>
                {clues.map((clue, index) => (
                  <View key={`${clue}-${index}`} style={styles.clueItem}>
                    <View style={[styles.clueBullet, { backgroundColor: theme.primary }]} />
                    <ThemedText style={styles.clueText}>{clue}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={[styles.clueEmpty, { color: theme.textMuted }]}>
                Hinweise werden in Kürze freigegeben – halte Ausschau!
              </ThemedText>
            )
          ) : (
            <ThemedText style={[styles.clueEmpty, { color: theme.textMuted }]}>
              Sobald das Spiel startet, erscheinen hier deine persönlichen Hinweise.
            </ThemedText>
          )}
        </View>
      </ThemedView>

      <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ThemedText type="subtitle" style={styles.sectionHeading}>
          QR-Check
        </ThemedText>
        <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
          Wenn du sicher bist, wer zu dir gehört, scan den QR-Code der Person, um eure Verbindung zu bestätigen.
        </ThemedText>
        <View style={styles.actionsRow}>
          <Button onPress={() => router.navigate("/game/modal/camera")} iconText="scanner.circle">
            Scan QR-Code
          </Button>
        </View>
        <View style={styles.qrWrapper}>
          <QRCodeStyled
            data={guestId}
            size={250}
            isPiecesGlued={true}
            pieceBorderRadius={5}
            pieceLiquidRadius={2}
            color={theme.text}
            style={{ backgroundColor: theme.backgroundAlt }}
            errorCorrectionLevel="M"
          />
          <ThemedText style={[styles.qrHint, { color: theme.textMuted }]}>Deine Guest-Id: {guestId}</ThemedText>
          <ThemedText style={[styles.qrHint, { color: theme.textMuted }]}>
            Zeig diesen Code deiner Partnerperson, damit sie dich scannen kann. Auf der nächsten Seite deines Partners
            kannst du seinen Code scannen.
          </ThemedText>
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
  },
  heroCard: {
    gap: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeStarted: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  statusBadgeWaiting: {
    backgroundColor: "rgba(148,163,184,0.15)",
    borderColor: "rgba(148,163,184,0.4)",
  },
  statusBadgeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  titleRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  titleText: {
    flex: 1,
  },
  leadText: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionHeading: {
    fontSize: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionIntro: {
    fontSize: 15,
    lineHeight: 22,
  },
  clueCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  clueTitle: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  clueList: {
    gap: 12,
  },
  clueItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  clueBullet: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginTop: 7,
  },
  clueText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
  },
  clueEmpty: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionsRow: {
    alignItems: "flex-start",
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
});
