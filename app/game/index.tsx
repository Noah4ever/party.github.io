import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { Button } from "@/components/game/Button";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { useGameStateSubscription } from "@/hooks/use-game-state";
import { gameApi } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { QrCodeSvg, defaultRenderer as renderer } from "react-native-qr-svg";

//TODO: ASHLI fix picture
//TODO: TG change colors
//TODO: NOAH Welcoming Message with guest name
//TODO: NOAH add background color like admin tool and border clues

export default function HomeScreen() {
  const theme = useTheme();
  const { started, connected, cluesUnlockedAt } = useGameStateSubscription();
  const router = useRouter();
  const local = useLocalSearchParams();
  const [guestId, setGuestId] = useState("error");
  const [clues, setClues] = useState<string[]>();
  useEffect(() => {
    if (local.guestId && !Array.isArray(local.guestId)) {
      AsyncStorage.setItem("guestId", local.guestId);
      setGuestId(local.guestId);
    } else if (!local.guestId) {
      (async () => {
        const guestId = await AsyncStorage.getItem("guestId");
        if (guestId) {
          setGuestId(guestId);
        }
      })();
    }
  }, []);

  useEffect(() => {
    console.log(started);
    if (started && guestId) {
      (async () => {
        const guestId = await AsyncStorage.getItem("guestId");
        if (guestId) {
          const data = await gameApi.getPartnerClues(guestId);
          if ("clues" in data && data.clues) {
            setClues(data.clues);
            console.log(data.clues);
          }
        }
      })();
    }
  }, [started, guestId]);

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
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          {started ? "Das Spiel läuft!" : "Warte bis das Spiel startet"}
        </ThemedText>
        <ThemedText style={{ color: theme.textMuted, marginBottom: 16 }}>
          {connected
            ? started
              ? cluesUnlockedAt
                ? `Hinweise seit ${new Date(
                    cluesUnlockedAt
                  ).toLocaleTimeString()}`
                : "Hinweise sind verfügbar."
              : "Wir benachrichtigen dich automatisch, sobald das Spiel beginnt."
            : "Verbindung zum Server wird hergestellt…"}
        </ThemedText>
        <ThemedText type="normal">Challenge 1 : Finde deine Person</ThemedText>
        <ThemedText type="normal" style={styles.clueBox}>
          Hinweise:{" "}
          {clues &&
            clues.map((clue) => {
              return <ThemedText>{clue} </ThemedText>;
            })}
        </ThemedText>
      </ThemedView>
      <ThemedView className="scan">
        <ThemedText type="normal">
          Wenn du glaubst, deine Person gefunden zu haben, dann scanner ihren QR
          Code
        </ThemedText>

        <Button
          onPress={() => router.navigate("/game/modal/camera")}
          iconText="scanner.circle"
        >
          Scan QR-Code
        </Button>
      </ThemedView>
      <ThemedView
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginTop: 0,
          flex: 1,
        }}
      >
        <QrCodeSvg
          value={guestId}
          frameSize={300}
          renderer={renderer}
          dotColor={theme.text}
          backgroundColor={theme.background}
          errorCorrectionLevel="M"
        />
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
  scanLink: {
    paddingTop: 50,
  },
});
