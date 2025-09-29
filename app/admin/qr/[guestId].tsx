import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";
import { QrCodeSvg, defaultRenderer as renderer } from "react-native-qr-svg";

export default function GuestQRCode() {
  const theme = useTheme();
  const { guestId } = useLocalSearchParams<{ guestId?: string }>();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">QR Code for (ID: {guestId})</ThemedText>
      <ThemedView style={{ justifyContent: "center", alignItems: "center", marginTop: 20, flex: 1 }}>
        {/* Add correct value for QR Code */}
        <QrCodeSvg
          value={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
          content={
            <ThemedText style={{ fontSize: 20, alignItems: "center", justifyContent: "center", flex: 1 }}>
              😉
            </ThemedText>
          }
          contentCells={5}
          frameSize={200}
          renderer={renderer}
          dotColor={theme.text}
          backgroundColor={theme.background}
          errorCorrectionLevel="M"
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "flex-start", padding: 20 },
});
