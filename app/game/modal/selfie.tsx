import { Button } from "@/components/game/Button";
import { HelloWave } from "@/components/hello-wave";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { gameApi } from "@/lib/api";
import { confirm, showAlert } from "@/lib/dialogs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraCapturedPicture, CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const CAPTURE_QUALITY = 1;

export default function SelfieModal() {
  const theme = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureInFlight, setCaptureInFlight] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<CameraCapturedPicture | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const feedbackScale = feedbackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const hasPermission = permission?.granted === true;

  useEffect(() => {
    setCameraReady(false);
  }, [permission?.granted]);

  useEffect(() => {
    (async () => {
      const storedGuestId = await AsyncStorage.getItem("guestId");
      if (storedGuestId) {
        setGuestId(storedGuestId);
      }
      const storedGroupId = await AsyncStorage.getItem("groupId");
      if (storedGroupId) {
        setGroupId(storedGroupId);
      }
    })();
  }, []);

  useEffect(() => {
    if (!feedback) {
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
        if (feedback === "success") {
          setUploading(false);
          router.navigate("/game/group-name");
        }
        setFeedback(null);
        setUploading(false);
      },
      feedback === "success" ? 1000 : 1600
    );

    return () => clearTimeout(timeout);
  }, [feedback, feedbackAnim, router]);

  const handleRequestPermission = useCallback(() => {
    requestPermission();
  }, [requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!hasPermission || captureInFlight || uploading || preview) {
      return;
    }
    if (!cameraRef.current || !cameraReady) {
      showAlert({
        title: "Kamera nicht bereit",
        message: "Wir konnten die Kamera noch nicht vorbereiten. Versuche es in ein paar Sekunden erneut.",
      });
      return;
    }
    setCaptureInFlight(true);
    try {
      const result = await cameraRef.current.takePictureAsync({
        quality: CAPTURE_QUALITY,
        base64: Platform.OS === "web",
        skipProcessing: false,
      });
      if (result) {
        setPreview(result);
      }
    } catch (error) {
      console.error("selfie capture error", error);
      showAlert({
        title: "Ups!",
        message: "Das Foto konnte nicht aufgenommen werden. Bitte probiert es gleich nochmal.",
      });
    } finally {
      setCaptureInFlight(false);
    }
  }, [cameraReady, captureInFlight, hasPermission, preview, uploading]);

  const handleRetake = useCallback(() => {
    if (uploading) {
      return;
    }
    setPreview(null);
    setFeedback(null);
    setCameraReady(false);
  }, [uploading]);

  const uploadDisabled = useMemo(() => uploading || captureInFlight || !preview, [captureInFlight, preview, uploading]);

  const handleUpload = useCallback(async () => {
    if (uploadDisabled || (!preview?.uri && !preview?.base64)) {
      return;
    }
    if (!guestId) {
      showAlert({
        title: "Fehlende ID",
        message: "Wir konnten deine Gäst-ID nicht finden. Bitte gehe zurück und versuche es erneut.",
      });
      return;
    }

    try {
      setUploading(true);
      const filename = `selfie-${guestId}-${Date.now()}.jpg`;
      const formData = new FormData();

      if (Platform.OS === "web") {
        let blob: Blob | null = null;
        const sourceUri = preview.uri ?? (preview.base64 ? `data:image/jpeg;base64,${preview.base64}` : null);
        if (sourceUri) {
          try {
            const response = await fetch(sourceUri);
            blob = await response.blob();
          } catch (blobError) {
            console.error("selfie blob fetch failed", blobError);
          }
        }
        if (!blob && preview.base64) {
          try {
            const byteCharacters = atob(preview.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i += 1) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: "image/jpeg" });
          } catch (blobFromBase64Error) {
            console.error("selfie blob base64 conversion failed", blobFromBase64Error);
          }
        }
        if (!blob) {
          throw new Error("SELFIE_BLOB_MISSING");
        }
        const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
        formData.append("image", file);
      } else {
        const normalizedUri = preview.uri.startsWith("file://") ? preview.uri : `file://${preview.uri}`;
        formData.append("image", {
          uri: normalizedUri,
          name: filename,
          type: "image/jpeg",
        } as any);
      }
      formData.append("guestId", guestId);
      if (groupId) {
        formData.append("groupId", groupId);
      }
      formData.append("challengeId", "challenge_2");

      const response = await gameApi.uploadSelfie(formData);
      if (response && typeof response === "object" && "url" in response && typeof response.url === "string") {
        const preferredUrl =
          "absoluteUrl" in response && typeof response.absoluteUrl === "string" && response.absoluteUrl
            ? response.absoluteUrl
            : response.url;
        const payload = {
          url: preferredUrl,
          uploadedAt:
            "uploadedAt" in response && typeof response.uploadedAt === "string"
              ? response.uploadedAt
              : new Date().toISOString(),
        };
        await AsyncStorage.setItem("challenge2Selfie", JSON.stringify(payload));
      }
      if (groupId) {
        try {
          await gameApi.recordProgress(groupId, "challenge-2-selfie");
        } catch (progressError) {
          console.warn("progress update failed", progressError);
        }
      }
      setFeedback("success");
    } catch (error) {
      console.error("selfie upload error", error);
      setFeedback("error");
      showAlert({
        title: "Upload fehlgeschlagen",
        message: "Das Foto konnte nicht hochgeladen werden. Prüft eure Internetverbindung und versucht es nochmal.",
      });
    }
  }, [uploadDisabled, preview, guestId, groupId]);

  const handleSkip = useCallback(async () => {
    const confirmed = await confirm({
      title: "Selfie überspringen?",
      message: "Ohne Foto geht ihr direkt weiter?",
      confirmLabel: "Überspringen",
      cancelLabel: "Zurück",
    });

    if (!confirmed) {
      return;
    }

    setPreview(null);
    setFeedback(null);
    setUploading(false);
    await AsyncStorage.removeItem("challenge2Selfie");
    router.back();
    router.navigate("/game/group-name");
  }, [router]);

  const permissionStatusLabel = useMemo(() => {
    if (hasPermission) {
      return "Kamera bereit";
    }
    if (permission?.canAskAgain === false) {
      return "Zugriff verweigert – bitte in den Einstellungen aktivieren.";
    }
    return "Kamera-Zugriff ausstehend";
  }, [hasPermission, permission?.canAskAgain]);

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
              Selfie für Challenge 2
            </ThemedText>
            <HelloWave />
          </View>
          <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
            Fangt euren Moment ein! Sobald das Foto hochgeladen ist, könnt ihr direkt zur nächsten Challenge springen.
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              hasPermission ? { backgroundColor: theme.success } : styles.statusBadgeWaiting,
              { borderColor: hasPermission ? theme.success : "rgba(148,163,184,0.4)" },
            ]}>
            <IconSymbol
              name={hasPermission ? "checkmark.circle" : "lock.open"}
              size={18}
              color={hasPermission ? "#16A34A" : theme.textMuted}
            />
            <ThemedText style={[styles.statusBadgeLabel, { color: hasPermission ? "#14532D" : theme.textMuted }]}>
              {permissionStatusLabel}
            </ThemedText>
          </View>
        </ThemedView>

        {!hasPermission ? (
          <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle" style={styles.sectionHeading}>
                Zugriff freigeben
              </ThemedText>
              <IconSymbol name="camera.viewfinder" size={20} color={theme.primary} />
            </View>
            <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
              Wir benötigen euren Kamera-Zugriff, damit ihr das Selfie aufnehmen könnt. Ihr könnt die Freigabe später
              jederzeit entziehen.
            </ThemedText>
            {permission?.canAskAgain !== false && (
              <Button onPress={handleRequestPermission} iconText="lock.open">
                Kamera freigeben
              </Button>
            )}
          </ThemedView>
        ) : null}

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle" style={styles.sectionHeading}>
              Macht euer Selfie
            </ThemedText>
            <IconSymbol name="camera" size={20} color={theme.primary} />
          </View>
          <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
            Nutzt das Frontkamera-Preview, damit ihr beide im Bild seid. Wenn euch das Foto nicht gefällt, könnt ihr es
            jederzeit neu aufnehmen.
          </ThemedText>
          <View
            style={[
              styles.cameraFrame,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
              },
            ]}>
            {preview ? (
              <Image source={{ uri: preview.uri }} style={styles.previewImage} contentFit="cover" />
            ) : hasPermission ? (
              <View style={styles.cameraPreviewWrapper}>
                <CameraView
                  ref={cameraRef}
                  style={styles.cameraPreview}
                  facing="front"
                  enableTorch={false}
                  onCameraReady={() => setCameraReady(true)}
                />
                {!cameraReady && (
                  <View style={[styles.cameraLoadingOverlay, { backgroundColor: theme.overlay }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText style={[styles.cameraLoadingText, { color: theme.textSecondary }]}>
                      Kamera wird aktiviert …
                    </ThemedText>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <IconSymbol name="camera.viewfinder" size={40} color={theme.textMuted} />
                <ThemedText style={[styles.placeholderText, { color: theme.textMuted }]}>
                  Kamera wartet auf Freigabe
                </ThemedText>
              </View>
            )}
          </View>

          {preview ? (
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}
                activeOpacity={0.8}
                onPress={handleRetake}
                disabled={uploading}>
                <IconSymbol name="arrow.down.circle" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
                  Neu aufnehmen
                </ThemedText>
              </TouchableOpacity>
              <Button onPress={handleUpload} iconText="arrow.up.circle">
                {uploading ? "Lädt …" : "Selfie hochladen"}
              </Button>
            </View>
          ) : (
            <Button onPress={handleCapture} iconText="camera.viewfinder">
              {captureInFlight ? "Aufnahme …" : "Foto aufnehmen"}
            </Button>
          )}
          <TouchableOpacity style={styles.skipLink} onPress={handleSkip} disabled={uploading || captureInFlight}>
            <ThemedText style={[styles.skipLinkText, { color: theme.textMuted }]}>Selfie überspringen</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>

      {feedback && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.feedbackOverlay,
            {
              backgroundColor: feedback === "success" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
              borderColor: feedback === "success" ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)",
              opacity: feedbackAnim,
              transform: [{ scale: feedbackScale }],
            },
          ]}>
          <IconSymbol
            name={feedback === "success" ? "checkmark.circle" : "xmark.circle"}
            size={56}
            color={feedback === "success" ? theme.success : theme.danger}
          />
          <ThemedText style={[styles.feedbackText, { color: feedback === "success" ? theme.success : theme.danger }]}>
            {feedback === "success" ? "Selfie gespeichert!" : "Leider fehlgeschlagen."}
          </ThemedText>
        </Animated.View>
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
    gap: 24,
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
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 16,
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
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    height: 380,
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
    fontSize: 15,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
  },
  previewImage: {
    flex: 1,
    width: "100%",
  },
  previewActions: {
    gap: 12,
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  skipLink: {
    marginTop: 12,
    alignSelf: "center",
  },
  skipLinkText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  feedbackOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  feedbackText: {
    fontSize: 22,
    fontWeight: "700",
  },
});
