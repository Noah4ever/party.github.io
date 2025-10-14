import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { Link, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import QRCodeStyled from "react-native-qrcode-styled";

export default function GuestQRCode() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ guestId?: string | string[] }>();

  const guestId = useMemo(() => {
    const value = params.guestId;
    if (Array.isArray(value)) return value[0];
    return typeof value === "string" ? value : undefined;
  }, [params.guestId]);

  const qrUrl = useMemo(() => {
    if (!guestId) return "https://party.thiering.org/game";
    const encoded = encodeURIComponent(guestId);
    return `https://party.thiering.org/game?guestId=${encoded}`;
  }, [guestId]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ textAlign: "center" }}>
        {guestId ? `Show this QR to ${guestId}` : "QR code unavailable"}
      </ThemedText>
      <ThemedText type="subtitle" style={{ color: theme.textMuted, marginTop: 12, textAlign: "center" }}>
        Guests should scan this code with their phone camera to open the game and automatically identify themselves.
      </ThemedText>

      <ThemedView style={{ justifyContent: "center", alignItems: "center", marginTop: 0, flex: 1 }}>
        <QRCodeStyled
          data={qrUrl}
          size={325}
          isPiecesGlued={true}
          pieceBorderRadius={5}
          pieceLiquidRadius={2}
          color={theme.text}
          style={{ backgroundColor: theme.background }}
          errorCorrectionLevel="M"
        />
      </ThemedView>

      <Link
        href={{
          pathname: "/game",
          params: guestId ? { guestId } : {},
        }}
        style={{
          marginTop: 12,
          textAlign: "center",
          color: theme.textMuted,
          fontSize: 13,
          paddingHorizontal: 12,
          textDecorationLine: "underline",
        }}>
        {qrUrl}
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "flex-start", padding: 20 },
});
