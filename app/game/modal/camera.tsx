import { Button } from "@/components/game/Button";
import { HelloWave } from "@/components/hello-wave";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { gameApi } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import confetti from "canvas-confetti";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function CameraModal() {
  const router = useRouter();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<"success" | "error" | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualPartnerId, setManualPartnerId] = useState("");
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const feedbackScale = feedbackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  useEffect(() => {
    const granted = permission?.granted ?? false;
    setCameraActive(granted);
    setCameraReady(false);
  }, [permission?.granted]);

  useEffect(() => {
    if (!scanFeedback) {
      return;
    }
    feedbackAnim.setValue(0);
    Animated.spring(feedbackAnim, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();

  

    const timeout = setTimeout(
      () => {
        if (scanFeedback === "success") {
          router.back();
          router.navigate("/game/challenge_2");
        }
        setScanFeedback(null);
        setIsProcessingScan(false);
      },
      scanFeedback === "success" ? 900 : 1400
    );

    return () => clearTimeout(timeout);
  }, [scanFeedback, feedbackAnim, router]);

  const permissionGranted = permission?.granted === true;
  const permissionStatusLabel = useMemo(
    () => (permissionGranted ? "Bereit zum Scannen" : "Kamera-Zugriff ausstehend"),
    [permissionGranted]
  );

  const handleRequestPermission = useCallback(() => {
    requestPermission();
  }, [requestPermission]);

  const performVerification = useCallback(
    async (partnerId: string) => {
      if (isProcessingScan || scanFeedback) {
        return;
      }
      setIsProcessingScan(true);

      const guestId = await AsyncStorage.getItem("guestId");
      if (!guestId) {
        setIsProcessingScan(false);
        showAlert({
          title: "Fehlende Daten",
          message: "Wir konnten deine eigene Gast-ID nicht laden. Bitte lade die Seite neu oder scanne erneut.",
        });
        return;
      }

      try {
        const result = await gameApi.verifyPartner(guestId, partnerId.trim());

        if ("match" in result && result.match && result.groupId) {
          await AsyncStorage.setItem("groupId", result.groupId);
           
      confetti({
          particleCount: 100,
          angle: 280,
          spread: 60,
          origin: { y: -1 },
        });
    
          setTimeout(() => {
          setScanFeedback("success");
          }, 1000);
        } else {
          setScanFeedback("error");
        }
      } catch {
        setScanFeedback("error");
      }
    },
    [isProcessingScan, scanFeedback]
  );

  const handleScan = useCallback(
    async (scanningResult: BarcodeScanningResult) => {
      const partnerId = scanningResult.data?.trim();
      if (!partnerId) {
        return;
      }
      await performVerification(partnerId);
    },
    [performVerification]
  );

  const handleManualSubmit = useCallback(async () => {
    if (isProcessingScan || scanFeedback) {
      return;
    }
    const normalized = manualPartnerId.trim();
    if (!normalized) {
      showAlert({
        title: "Partner-ID fehlt",
        message: "Bitte gib die ID deiner vermuteten Partnerperson ein.",
      });
      return;
    }
    setManualEntryOpen(false);
    setManualPartnerId("");
    await performVerification(normalized);
  }, [isProcessingScan, manualPartnerId, performVerification, scanFeedback]);

  if (!permission) {
    return (
      <ThemedView style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textMuted }]}>Kamera wird vorbereitet …</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={[styles.card, styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>
              Scan deinen Party-Partner
            </ThemedText>
            <HelloWave />
          </View>
          <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
            Richte die Kamera auf den QR-Code deiner Party-Person, sobald ihr glaubt euch gefunden zu haben.
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              permissionGranted ? { backgroundColor: theme.success } : styles.statusBadgeWaiting,
              { borderColor: permissionGranted ? theme.success : "rgba(148,163,184,0.4)" },
            ]}>
            <IconSymbol
              name={permissionGranted ? "checkmark.circle" : "lock.open"}
              size={18}
              color={permissionGranted ? "#16A34A" : theme.textMuted}
            />
            <ThemedText style={[styles.statusBadgeLabel, { color: permissionGranted ? "#14532D" : theme.textMuted }]}>
              {permissionStatusLabel}
            </ThemedText>
          </View>
        </ThemedView>
        {!permissionGranted ? (
          <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle" style={styles.sectionHeading}>
                Vorbereitung
              </ThemedText>
              <IconSymbol name="camera.viewfinder" size={20} color={theme.primary} />
            </View>
            <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
              Erlaub uns den Kamera-Zugriff, damit du QR-Codes scannen kannst. Du kannst den Zugriff jederzeit wieder
              entziehen.
            </ThemedText>
            {!permissionGranted && (
              <Button onPress={handleRequestPermission} iconText="lock.open">
                Kamera freigeben
              </Button>
            )}
          </ThemedView>
        ) : null}

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle" style={styles.sectionHeading}>
              QR-Scanner
            </ThemedText>
            <IconSymbol name="qrcode.viewfinder" size={20} color={theme.primary} />
          </View>
          <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
            Halte den Code in den markierten Bereich. Wir melden uns sofort, wenn es ein Match ist.
          </ThemedText>
          <View
            style={[
              styles.cameraFrame,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
              },
            ]}>
            {cameraActive && permissionGranted ? (
              <View style={styles.cameraPreviewWrapper}>
                <CameraView
                  key="party-camera"
                  style={styles.cameraPreview}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onCameraReady={() => setCameraReady(true)}
                  onBarcodeScanned={handleScan}
                />
                {!cameraReady && (
                  <View style={[styles.cameraLoadingOverlay, { backgroundColor: theme.overlay }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText style={[styles.cameraLoadingText, { color: theme.textSecondary }]}>
                      Kamera wird aktiviert ...
                    </ThemedText>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <IconSymbol name="camera" size={40} color={theme.textMuted} />
                <ThemedText style={[styles.placeholderText, { color: theme.textMuted }]}>
                  Kamera wartet auf Freigabe
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.cameraHint, { color: theme.textMuted, textAlign: "center" }]}>
            {permissionGranted
              ? "Leg los! Du kannst jederzeit erneut scannen."
              : "Nach der Freigabe erscheint hier die Live-Kamera."}
          </ThemedText>
        </ThemedView>
        {permissionGranted && (
          <TouchableOpacity
            style={styles.fallbackLink}
            onPress={() => {
              if (!isProcessingScan && !scanFeedback) {
                setManualPartnerId("");
                setManualEntryOpen(true);
              }
            }}>
            <ThemedText style={[styles.fallbackLinkText, { color: theme.textMuted }]}>
              Scanner funktioniert nicht? Partner-ID eingeben
            </ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {scanFeedback && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.feedbackOverlay,
            {
              backgroundColor: scanFeedback === "success" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
              borderColor: scanFeedback === "success" ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)",
              opacity: feedbackAnim,
              transform: [{ scale: feedbackScale }],
            },
          ]}>
          <IconSymbol
            name={scanFeedback === "success" ? "checkmark.circle" : "xmark.circle"}
            size={56}
            color={scanFeedback === "success" ? theme.success : theme.danger}
          />
          <ThemedText
            style={[styles.feedbackText, { color: scanFeedback === "success" ? theme.success : theme.danger }]}>
            {scanFeedback === "success" ? "Match gefunden!" : "Leider kein Match."}
          </ThemedText>
        </Animated.View>
      )}

      {manualEntryOpen && (
        <View style={styles.manualOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              if (isProcessingScan) {
                return;
              }
              setManualEntryOpen(false);
              setManualPartnerId("");
            }}
          />
          <ThemedView style={[styles.manualCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText type="subtitle" style={styles.manualTitle}>
              Partner-ID eingeben
            </ThemedText>
            <ThemedText style={[styles.manualDescription, { color: theme.textSecondary }]}>
              Falls der QR-Scanner streikt, gib hier die ID deiner vermuteten Partnerperson ein.
            </ThemedText>
            <View style={[styles.manualInputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <TextInput
                style={[styles.manualInput, { color: theme.text }]}
                placeholder="z. B. GUEST-1234"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                value={manualPartnerId}
                onChangeText={setManualPartnerId}
                editable={!isProcessingScan}
              />
            </View>
            <View style={styles.manualActions}>
              <TouchableOpacity
                style={styles.manualCancelButton}
                onPress={() => {
                  if (isProcessingScan) {
                    return;
                  }
                  setManualEntryOpen(false);
                  setManualPartnerId("");
                }}
                disabled={isProcessingScan}>
                <ThemedText style={[styles.manualCancel, { color: theme.textMuted }]}>Abbrechen</ThemedText>
              </TouchableOpacity>
              <Button onPress={handleManualSubmit} iconText="checkmark.circle">
                ID bestätigen
              </Button>
            </View>
          </ThemedView>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  partyHeader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  partyGlow: {
    position: "absolute",
    borderRadius: 200,
    width: 220,
    height: 220,
    opacity: 0.45,
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
    width: 180,
    height: 120,
  },
  confetti: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
  },
  confettiOne: {
    height: 30,
    backgroundColor: "#F59E0B",
    top: 30,
    left: 50,
    transform: [{ rotate: "18deg" }],
  },
  confettiTwo: {
    height: 26,
    backgroundColor: "#22C55E",
    top: 44,
    right: 60,
    transform: [{ rotate: "-14deg" }],
  },
  confettiThree: {
    height: 28,
    backgroundColor: "#8B5CF6",
    bottom: 30,
    right: 80,
    transform: [{ rotate: "30deg" }],
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 16,
    marginBottom: 24,
  },
  heroCard: {
    gap: 18,
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
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeReady: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusBadgeWaiting: {
    backgroundColor: "rgba(148,163,184,0.15)",
  },
  statusBadgeLabel: {
    fontSize: 14,
    fontWeight: "600",
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
  cameraFrame: {
    borderRadius: 42,
    borderWidth: StyleSheet.hairlineWidth,
    height: 360,
    overflow: "hidden",
    justifyContent: "center",
  },
  cameraPreviewWrapper: {
    flex: 1,
  },
  cameraPreview: {
    flex: 1,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  cameraLoadingText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
  },
  cameraHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  fallbackLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  fallbackLinkText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 24,
    zIndex: 20,
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: "700",
  },
  manualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 30,
  },
  manualCard: {
    width: "100%",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 18,
  },
  manualTitle: {
    textAlign: "center",
  },
  manualDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  manualInputWrapper: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  manualInput: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  manualActions: {
    alignSelf: "stretch",
    gap: 12,
  },
  manualCancelButton: {
    alignSelf: "center",
  },
  manualCancel: {
    fontSize: 15,
  },
});
