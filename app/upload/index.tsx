import { Button } from "@/components/game/Button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { gameApi } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import { ResizeMode, Video } from "expo-av";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type MediaType = "image" | "video";

type SelectedMedia = {
  id: string;
  uri: string;
  type: MediaType;
  fileName: string;
  size?: number | null;
  duration?: number | null;
  mimeType?: string | null;
  base64?: string | null;
  file?: File | null;
};

const WEB_IMAGE_MAX_SIZE_MB = 3.5;
const WEB_IMAGE_MAX_DIMENSION = 2048;
const WEB_IMAGE_TARGET_QUALITY = 0.82;

function isWebEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => resolve(img);
      img.onerror = (event: string | Event) => reject(event);
      img.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function maybeCompressWebImage(file: File): Promise<File> {
  if (!isWebEnvironment()) return file;
  if (!file.type?.startsWith("image/")) return file;

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb <= WEB_IMAGE_MAX_SIZE_MB) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const width = img.width || WEB_IMAGE_MAX_DIMENSION;
    const height = img.height || WEB_IMAGE_MAX_DIMENSION;

    const scale = Math.min(1, WEB_IMAGE_MAX_DIMENSION / width, WEB_IMAGE_MAX_DIMENSION / height);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/jpeg", WEB_IMAGE_TARGET_QUALITY)
    );

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.(heic|heif|png|jpeg|jpg|gif|webp)$/i, "") || "upload";
    return new File([blob], `${baseName}-compressed.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.warn("web image compression failed", error);
    return file;
  }
}

function inferMimeType(options: {
  mediaType: MediaType;
  explicitMime?: string | null;
  fileName?: string | null;
  uri?: string | null;
}): string {
  if (options.explicitMime) {
    return options.explicitMime;
  }

  const name = options.fileName ?? options.uri ?? "";
  const lowerName = name.toLowerCase();

  if (lowerName.endsWith(".mov") || lowerName.endsWith(".qt")) {
    return "video/quicktime";
  }
  if (lowerName.endsWith(".m4v")) {
    return "video/x-m4v";
  }
  if (lowerName.endsWith(".mp4")) {
    return "video/mp4";
  }
  if (lowerName.endsWith(".png")) {
    return "image/png";
  }
  if (lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) {
    return "image/heic";
  }
  if (lowerName.endsWith(".gif")) {
    return "image/gif";
  }

  return options.mediaType === "video" ? "video/mp4" : "image/jpeg";
}

function preferredExtensionFromMime(mime: string, fallback: MediaType): string {
  const lower = mime.toLowerCase();
  if (lower === "video/quicktime") return ".mov";
  if (lower === "video/x-m4v") return ".m4v";
  if (lower === "video/mp4") return ".mp4";
  if (lower === "image/png") return ".png";
  if (lower === "image/gif") return ".gif";
  if (lower === "image/heic" || lower === "image/heif") return ".heic";
  return fallback === "video" ? ".mp4" : ".jpg";
}

function ensureFileName(fileName: string | null | undefined, mime: string, mediaType: MediaType): string {
  const safeName = fileName?.trim();
  if (safeName) {
    return safeName;
  }
  const ext = preferredExtensionFromMime(mime, mediaType);
  return `party-${mediaType}-${Date.now()}${ext}`;
}

function base64ToBlob(base64Input: string, mimeType: string): Blob {
  const cleaned = base64Input.includes(",") ? base64Input.split(",").pop() ?? "" : base64Input;
  const decode =
    typeof globalThis !== "undefined" && typeof (globalThis as { atob?: (value: string) => string }).atob === "function"
      ? (globalThis as { atob: (value: string) => string }).atob
      : null;
  if (!decode) {
    throw new Error("BASE64_DECODE_UNSUPPORTED");
  }
  const byteCharacters = decode(cleaned);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || Number.isNaN(bytes)) return "–";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const decimals = size >= 10 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

export default function UploadMemoriesScreen() {
  const theme = useTheme();
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedItems, setFailedItems] = useState<string[]>([]);

  const totalSize = useMemo(() => media.reduce((sum, item) => sum + (item.size ?? 0), 0), [media]);

  const handlePick = useCallback(async () => {
    if (picking || uploading) return;

    try {
      setPicking(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert({
          title: "Zugriff erforderlich",
          message: "Bitte erlaube den Zugriff auf deine Mediathek, um Fotos oder Videos hochzuladen.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
        base64: Platform.OS === "web",
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setMedia((prev) => {
        const existing = new Map(prev.map((item) => [item.id, item]));
        const next = [...prev];
        result.assets.forEach((asset) => {
          const id = asset.assetId ?? `${asset.uri}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          if (existing.has(id)) {
            return;
          }
          const type: MediaType = asset.type === "video" ? "video" : "image";
          const inferredMime = inferMimeType({
            mediaType: type,
            explicitMime: asset.mimeType ?? null,
            fileName: asset.fileName,
            uri: asset.uri,
          });
          const fileName = ensureFileName(asset.fileName, inferredMime, type);
          next.push({
            id,
            uri: asset.uri,
            type,
            fileName,
            size: asset.fileSize ?? null,
            duration: asset.duration ?? null,
            mimeType: inferredMime,
            base64: asset.base64 ?? null,
            file: asset.file instanceof File ? asset.file : null,
          });
        });
        return next;
      });
    } catch (error) {
      console.error("media picker error", error);
      showAlert({
        title: "Fehler",
        message: "Die Mediathek konnte nicht geöffnet werden. Versuche es später erneut.",
      });
    } finally {
      setPicking(false);
    }
  }, [picking, uploading]);

  const handleRemove = useCallback((id: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const resetStatus = useCallback(() => {
    setCompletedCount(0);
    setFailedItems([]);
  }, []);

  const handleUpload = useCallback(async () => {
    if (media.length === 0 || uploading) {
      showAlert({
        title: "Keine Auswahl",
        message: "Wähle zuerst Fotos oder Videos aus, die du teilen möchtest.",
      });
      return;
    }

    setUploading(true);
    resetStatus();
    const failed: string[] = [];
    let successCount = 0;

    for (const item of media) {
      try {
        const formData = new FormData();
        const mimeType =
          item.mimeType ??
          inferMimeType({
            mediaType: item.type,
            fileName: item.fileName,
            uri: item.uri,
          });
        const fileName = ensureFileName(item.fileName, mimeType, item.type);

        if (Platform.OS === "web") {
          let uploadFile: File | null = null;
          if (item.file instanceof File) {
            uploadFile = item.file;
          } else {
            let blob: Blob | null = null;
            try {
              const response = await fetch(item.uri);
              blob = await response.blob();
            } catch (fetchError) {
              console.warn("media blob fetch failed, attempting base64 fallback", fetchError);
            }

            if (!blob && item.base64) {
              try {
                blob = base64ToBlob(item.base64, mimeType);
              } catch (base64Error) {
                console.error("media base64 conversion failed", base64Error);
              }
            }

            if (!blob) {
              throw new Error("UPLOAD_SOURCE_UNAVAILABLE");
            }

            uploadFile = new File([blob], fileName, { type: blob.type || mimeType });
          }

          if (uploadFile?.type?.startsWith("image/")) {
            uploadFile = await maybeCompressWebImage(uploadFile);
          }

          if (!uploadFile) {
            throw new Error("UPLOAD_FILE_MISSING");
          }

          formData.append("media", uploadFile, uploadFile.name || fileName);
        } else {
          const normalizedUri = item.uri.startsWith("file://") ? item.uri : `file://${item.uri}`;
          formData.append("media", {
            uri: normalizedUri,
            name: fileName,
            type: mimeType,
          } as any);
        }

        formData.append("uploadedBy", "guest-upload");

        await gameApi.uploadMedia(formData);
        successCount += 1;
        setCompletedCount(successCount);
      } catch (error) {
        console.error("media upload error", error);
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        failed.push(`${item.fileName} (${message})`);
      }
    }

    setFailedItems(failed);
    setUploading(false);

    if (failed.length === 0) {
      setMedia([]);
      showAlert({
        title: "Danke!",
        message: "Deine Dateien wurden erfolgreich hochgeladen.",
      });
    } else {
      showAlert({
        title: "Einige Uploads sind fehlgeschlagen",
        message: `Bitte überprüfe deine Verbindung und versuche es erneut. Nicht hochgeladen: ${failed.join(", ")}`,
      });
    }
  }, [media, resetStatus, uploading]);

  const heroSubtitle = useMemo(() => {
    if (uploading) {
      return "Deine Erinnerungen werden hochgeladen …";
    }
    if (completedCount > 0 && failedItems.length === 0) {
      return `${completedCount} Dateien hochgeladen. Möchtest du weitere teilen?`;
    }
    if (failedItems.length > 0) {
      return `${completedCount} Dateien hochgeladen, ${failedItems.length} fehlgeschlagen.`;
    }
    return "Ladet eure schönsten Momente hoch - egal ob Fotos oder kurze Videos.";
  }, [completedCount, failedItems.length, uploading]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedView
            style={[
              styles.selectionCard,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}>
            <View style={[styles.heroIconBubble, { backgroundColor: theme.primaryMuted }]}>
              <IconSymbol name="camera" size={30} color={theme.primary} />
            </View>
            <ThemedText type="title" style={[styles.heroTitle, { color: theme.text }]}>
              Erinnerungen teilen
            </ThemedText>
            <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>{heroSubtitle}</ThemedText>
            <View style={styles.heroMetaRow}>
              <View style={[styles.heroMetaChip, { backgroundColor: theme.primaryMuted }]}>
                <IconSymbol name="photo.on.rectangle" size={16} color={theme.primary} />
                <ThemedText
                  style={[styles.heroMetaText, { color: theme.primary }]}>{`${media.length} ausgewählt`}</ThemedText>
              </View>
              <View style={[styles.heroMetaChip, { backgroundColor: theme.primaryMuted }]}>
                <IconSymbol name="tray.and.arrow.up" size={16} color={theme.primary} />
                <ThemedText style={[styles.heroMetaText, { color: theme.primary }]}>{`Gesamt ${formatBytes(
                  totalSize
                )}`}</ThemedText>
              </View>
              {uploading ? (
                <View style={[styles.heroMetaChip, { backgroundColor: theme.overlay }]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText style={[styles.heroMetaText, { color: theme.primary }]}>Upload läuft…</ThemedText>
                </View>
              ) : null}
            </View>
            <View style={styles.heroButtons}>
              <Button
                onPress={handlePick}
                iconText="photo.on.rectangle"
                disabled={picking || uploading}
                style={[
                  styles.fullButton,
                  { backgroundColor: media.length === 0 ? theme.primary : theme.inputBackground },
                ]}>
                {picking
                  ? "Öffne Mediathek …"
                  : media.length === 0
                  ? "Fotos oder Videos auswählen"
                  : "Weiter Datein auswählen"}
              </Button>
              <Button
                onPress={handleUpload}
                iconText="arrow.up.circle"
                disabled={uploading || media.length === 0}
                style={[styles.fullButton]}>
                {uploading ? `Lädt ${completedCount}/${media.length} …` : "Auswahl hochladen"}
              </Button>
            </View>
          </ThemedView>

          <ThemedView style={[styles.selectionCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.selectionHeader}>
              <View>
                <ThemedText style={[styles.selectionTitle, { color: theme.text }]}>Deine Auswahl</ThemedText>
                <ThemedText style={[styles.selectionSubtitle, { color: theme.textMuted }]}>
                  {media.length === 0
                    ? "Noch keine Dateien ausgewählt."
                    : `${media.length} Datei${media.length === 1 ? "" : "en"} • Gesamt ${formatBytes(totalSize)}`}
                </ThemedText>
              </View>
            </View>

            {media.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIllustration, { backgroundColor: theme.primaryMuted }]}>
                  <IconSymbol name="tray.and.arrow.up" size={28} color={theme.primary} />
                </View>
                <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
                  Tippe oben auf „Fotos oder Videos auswählen“, um Erinnerungen hinzuzufügen.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.mediaList}>
                {media.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.mediaItem,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundAlt,
                      },
                    ]}>
                    <View style={styles.mediaThumbnailWrapper}>
                      {item.type === "image" ? (
                        <ExpoImage source={{ uri: item.uri }} style={styles.mediaThumbnail} contentFit="cover" />
                      ) : (
                        <Video
                          source={{ uri: item.uri }}
                          style={styles.mediaThumbnail}
                          useNativeControls={false}
                          shouldPlay={false}
                          isLooping
                          resizeMode={ResizeMode.COVER}
                        />
                      )}
                      <View style={[styles.mediaBadge, { backgroundColor: theme.overlay }]}>
                        <IconSymbol
                          name={item.type === "video" ? "play.circle.fill" : "photo"}
                          size={16}
                          color={theme.text}
                        />
                      </View>
                    </View>
                    <View style={styles.mediaInfo}>
                      <ThemedText numberOfLines={1} style={[styles.mediaTitle, { color: theme.text }]}>
                        {item.fileName}
                      </ThemedText>
                      <View style={styles.mediaMetaRow}>
                        <ThemedText style={[styles.mediaMetaText, { color: theme.textMuted }]}>
                          {formatBytes(item.size)}
                        </ThemedText>
                        {item.duration ? (
                          <ThemedText style={[styles.mediaMetaText, { color: theme.textMuted }]}>
                            {item.type === "video" ? `${Math.round(item.duration)}s` : null}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => handleRemove(item.id)}
                      disabled={uploading}>
                      <IconSymbol name="trash.fill" size={16} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {failedItems.length > 0 ? (
              <View style={[styles.alertBox, { borderColor: theme.danger, backgroundColor: `${theme.danger}10` }]}>
                <IconSymbol name="exclamationmark.triangle" size={18} color={theme.danger} />
                <ThemedText style={[styles.alertText, { color: theme.danger }]}>
                  Nicht hochgeladen: {failedItems.join(", ")}
                </ThemedText>
              </View>
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    gap: 16,
  },
  heroIconBubble: {
    width: 60,
    height: 60,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  heroButtons: {
    gap: 12,
  },
  fullButton: {
    width: "100%",
  },
  helperNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  selectionCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  selectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 36,
  },
  emptyIllustration: {
    width: 68,
    height: 68,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  mediaList: {
    gap: 12,
  },
  mediaItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    position: "relative",
  },
  mediaThumbnailWrapper: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  mediaThumbnail: {
    width: "100%",
    height: "100%",
  },
  mediaBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaInfo: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  mediaMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  mediaMetaText: {
    fontSize: 13,
  },
  removeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
});
