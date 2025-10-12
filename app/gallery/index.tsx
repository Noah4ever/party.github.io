import { Button } from "@/components/game/Button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { GalleryUploadEntryDTO, GalleryUploadListDTO, gameApi, getBaseUrl } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { File as ExpoFile, Paths as ExpoPaths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { requestPermissionsAsync as requestMediaPermissionsAsync, saveToLibraryAsync } from "expo-media-library";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  GestureResponderEvent,
  Modal,
  PanResponder,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi)$/i;
const DEFAULT_VIDEO_RATIO = 16 / 9;
const DEFAULT_IMAGE_RATIO = 4 / 3;
const MAX_MEDIA_HEIGHT = 600;
const MIN_MEDIA_WIDTH = 200;
const VIEWER_MEDIA_PADDING = 48;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;
const SLIDER_THUMB_SIZE = 32;

function getDocument(): Document | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as any).document;
}

function isVideo(filename: string): boolean {
  return VIDEO_EXTENSIONS.test(filename);
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

function getFilenameFromContentDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      /* ignore malformed encoding */
    }
  }
  const quotedMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }
  return fallback;
}

export default function GalleryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<GalleryUploadEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mediaPermissionGranted, setMediaPermissionGranted] = useState<boolean>(Platform.OS === "web");
  const [userColumns, setUserColumns] = useState<number | null>(null);
  const [mediaRatios, setMediaRatios] = useState<Record<string, number>>({});
  const [sliderTrackWidth, setSliderTrackWidth] = useState(0);
  const videoRef = useRef<Video | null>(null);

  const rememberMediaRatio = useCallback((filename: string, width?: number | null, height?: number | null) => {
    if (!filename || !width || !height) return;
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    if (height === 0) return;
    const ratio = width / height;
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    setMediaRatios((prev) => {
      if (prev[filename]) return prev;
      return { ...prev, [filename]: ratio };
    });
  }, []);

  const autoColumns = useMemo(() => {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
  }, [width]);

  const columns = userColumns ?? autoColumns;
  const sliderRange = MAX_COLUMNS - MIN_COLUMNS;
  const sliderAnimatedFill = useRef(new Animated.Value(0)).current;
  const sliderAnimatedThumb = useRef(new Animated.Value(0)).current;
  const sliderActiveValueRef = useRef<number>(columns);

  useEffect(() => {
    sliderActiveValueRef.current = columns;
  }, [columns]);

  const sliderColumnsDisplay = useMemo(() => Math.round(columns), [columns]);

  const sliderDescription = useMemo(() => {
    switch (sliderColumnsDisplay) {
      case 1:
        return "Große Vorschau";
      case 2:
        return "Standard";
      case 3:
        return "Übersichtlich";
      case 4:
        return "Viele auf einmal";
      default:
        return `${sliderColumnsDisplay} Spalten`;
    }
  }, [sliderColumnsDisplay]);

  const handleColumnChange = useCallback((cols: number | null) => {
    setUserColumns(cols);
  }, []);

  const animateSlider = useCallback(
    (ratio: number, animated: boolean) => {
      if (sliderTrackWidth <= 0) return;
      const clamped = Math.min(Math.max(ratio, 0), 1);
      const targetFill = sliderTrackWidth * clamped;
      const maxThumb = Math.max(sliderTrackWidth - SLIDER_THUMB_SIZE, 0);
      const targetThumb = Math.min(Math.max(sliderTrackWidth * clamped - SLIDER_THUMB_SIZE / 2, 0), maxThumb);

      if (animated) {
        Animated.spring(sliderAnimatedFill, {
          toValue: targetFill,
          damping: 18,
          stiffness: 220,
          mass: 0.7,
          useNativeDriver: false,
        }).start();
        Animated.spring(sliderAnimatedThumb, {
          toValue: targetThumb,
          damping: 18,
          stiffness: 220,
          mass: 0.7,
          useNativeDriver: false,
        }).start();
      } else {
        sliderAnimatedFill.setValue(targetFill);
        sliderAnimatedThumb.setValue(targetThumb);
      }
    },
    [sliderAnimatedFill, sliderAnimatedThumb, sliderTrackWidth]
  );

  useEffect(() => {
    const committedRatio = sliderRange === 0 ? 0 : (columns - MIN_COLUMNS) / sliderRange;
    animateSlider(committedRatio, true);
  }, [animateSlider, columns, sliderRange]);

  const handleSliderRelease = useCallback(() => {
    if (sliderTrackWidth <= 0) return;
    const ratio = sliderRange === 0 ? 0 : (sliderActiveValueRef.current - MIN_COLUMNS) / sliderRange;
    animateSlider(ratio, true);
  }, [animateSlider, sliderRange, sliderTrackWidth]);

  const handleSliderInteraction = useCallback(
    (locationX: number, animated: boolean) => {
      if (sliderTrackWidth <= 0) return;
      const ratio = Math.min(Math.max(locationX / sliderTrackWidth, 0), 1);
      const rawValue = MIN_COLUMNS + ratio * sliderRange;
      animateSlider(ratio, animated);

      const nearest = Math.round(rawValue);
      if (nearest !== sliderActiveValueRef.current) {
        sliderActiveValueRef.current = nearest;
        handleColumnChange(nearest);
        if (Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => undefined);
        }
      }
    },
    [animateSlider, handleColumnChange, sliderActiveValueRef, sliderRange, sliderTrackWidth]
  );

  const handleSliderAccessibility = useCallback(
    (event: AccessibilityActionEvent) => {
      const action = event.nativeEvent.actionName;
      let next = sliderActiveValueRef.current;
      if (action === "increment") {
        next = Math.min(MAX_COLUMNS, sliderActiveValueRef.current + 1);
      } else if (action === "decrement") {
        next = Math.max(MIN_COLUMNS, sliderActiveValueRef.current - 1);
      }

      if (next !== sliderActiveValueRef.current) {
        sliderActiveValueRef.current = next;
        handleColumnChange(next);
        const ratio = sliderRange === 0 ? 0 : (next - MIN_COLUMNS) / sliderRange;
        animateSlider(ratio, true);
        if (Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => undefined);
        }
      }
    },
    [animateSlider, handleColumnChange, sliderActiveValueRef, sliderRange]
  );

  const sliderPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          handleSliderInteraction(evt.nativeEvent.locationX, false);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          handleSliderInteraction(evt.nativeEvent.locationX, false);
        },
        onPanResponderRelease: () => {
          handleSliderRelease();
        },
        onPanResponderTerminate: () => {
          handleSliderRelease();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [handleSliderInteraction, handleSliderRelease]
  );

  const itemWidth = useMemo(() => {
    const containerWidth = width - 32; // Account for padding
    const gap = 16;
    const totalGaps = (columns - 1) * gap;
    return (containerWidth - totalGaps) / columns;
  }, [width, columns]);

  const assetsBase = useMemo(() => getBaseUrl().replace(/\/?api$/, ""), []);

  const viewerPageWidth = useMemo(() => {
    const maxCardWidth = Math.min(width - 48, 860);
    return Math.max(maxCardWidth, 280);
  }, [width]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const loadItems = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    try {
      setError(null);
      const response = (await gameApi.getGalleryUploads()) as GalleryUploadListDTO;
      const files = [...(response.files ?? [])];
      files.sort((a, b) => {
        const aTime = new Date(a.uploadedAt ?? a.createdAt ?? a.updatedAt ?? 0).getTime();
        const bTime = new Date(b.uploadedAt ?? b.createdAt ?? b.updatedAt ?? 0).getTime();
        return bTime - aTime;
      });
      setItems(files);
      setSelected((prev) => {
        if (prev.size === 0) return prev;
        const validNames = new Set(files.map((file) => file.filename));
        const filtered = Array.from(prev).filter((name) => validNames.has(name));
        if (filtered.length === prev.size) return prev;
        return new Set(filtered);
      });
    } catch (err: any) {
      console.error("gallery fetch failed", err);
      const message = err?.message || "Die Galerie konnte nicht geladen werden.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadItems({ silent: true });
  }, [loadItems]);

  const selectionMode = selected.size > 0;

  const selectedItems = useMemo(() => items.filter((item) => selected.has(item.filename)), [items, selected]);
  const selectedCount = selectedItems.length;
  const allSelected = items.length > 0 && selected.size === items.length;

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleOpenViewer = useCallback((index: number) => {
    setCurrentIndex(index);
    setViewerVisible(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerVisible(false);
    const player = videoRef.current;
    if (player) {
      player.pauseAsync().catch(() => undefined);
      player.setPositionAsync(0).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (viewerVisible) {
      return;
    }
    const player = videoRef.current;
    if (player) {
      player.pauseAsync().catch(() => undefined);
      player.setPositionAsync(0).catch(() => undefined);
    }
  }, [viewerVisible]);

  const ensureMediaPermission = useCallback(async () => {
    if (Platform.OS === "web") return true;
    if (mediaPermissionGranted) return true;
    const response = await requestMediaPermissionsAsync();
    const granted = response.granted ?? response.status === "granted";
    setMediaPermissionGranted(granted);
    if (!granted) {
      showAlert({
        title: "Zugriff erforderlich",
        message: "Bitte erlaube den Zugriff auf die Mediathek, um Dateien speichern zu können.",
      });
    }
    return granted;
  }, [mediaPermissionGranted]);

  const downloadMedia = useCallback(
    async (item: GalleryUploadEntryDTO, options?: { silent?: boolean }) => {
      const url = `${assetsBase}${item.url}`;
      const fileName = item.filename || `gallery-${Date.now()}`;

      if (Platform.OS === "web") {
        try {
          const doc = getDocument();
          if (!doc || !doc.body) {
            throw new Error("Document unavailable");
          }

          const response = await fetch(url, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const header = response.headers.get("content-disposition");
          const downloadName = getFilenameFromContentDisposition(header, fileName);

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          const anchor = doc.createElement("a");
          anchor.href = objectUrl;
          anchor.download = downloadName;
          anchor.style.display = "none";
          anchor.rel = "noopener";
          doc.body.appendChild(anchor);
          anchor.click();
          doc.body.removeChild(anchor);

          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

          if (!options?.silent) {
            showAlert({ title: "Download gestartet", message: `${downloadName} wird heruntergeladen.` });
          }
          return true;
        } catch (err) {
          console.error("web download failed", err);
          showAlert({ title: "Download fehlgeschlagen", message: `${fileName} konnte nicht gespeichert werden.` });
          return false;
        }
      }

      const granted = await ensureMediaPermission();
      if (!granted) {
        return false;
      }

      const tempDirectory = (() => {
        try {
          return ExpoPaths.cache ?? ExpoPaths.document;
        } catch (err) {
          console.warn("Paths.cache unavailable, using document directory", err);
          return ExpoPaths.document;
        }
      })();

      let downloadedFile: ExpoFile | null = null;
      try {
        const tempFile = new ExpoFile(tempDirectory, fileName);
        const savedFile = (await ExpoFile.downloadFileAsync(url, tempFile)) as ExpoFile;
        downloadedFile = savedFile;
        await saveToLibraryAsync(savedFile.uri);
        if (!options?.silent) {
          showAlert({ title: "Gespeichert", message: `${fileName} wurde in deiner Mediathek gesichert.` });
        }
        return true;
      } catch (err) {
        console.error("media download failed", err);
        showAlert({ title: "Download fehlgeschlagen", message: `${fileName} konnte nicht gespeichert werden.` });
        return false;
      } finally {
        try {
          downloadedFile?.delete();
        } catch (cleanupError) {
          console.warn("temporary file cleanup failed", cleanupError);
        }
      }
    },
    [assetsBase, ensureMediaPermission]
  );

  const downloadArchive = useCallback(async (entries: GalleryUploadEntryDTO[]) => {
    if (entries.length === 0 || Platform.OS !== "web") {
      return false;
    }

    const doc = getDocument();
    if (!doc || !doc.body) {
      showAlert({
        title: "Downloads nicht verfügbar",
        message: "Mehrfach-Downloads werden nur im Browser unterstützt.",
      });
      return false;
    }

    try {
      const response = (await gameApi.archiveGalleryUploads(entries.map((entry) => entry.filename))) as Response;
      const blob = await response.blob();
      const header = response.headers.get("content-disposition");
      const fallbackName = `gallery-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      const zipName = getFilenameFromContentDisposition(header, fallbackName);

      const objectUrl = URL.createObjectURL(blob);
      const anchor = doc.createElement("a");
      anchor.href = objectUrl;
      anchor.download = zipName;
      anchor.style.display = "none";
      anchor.rel = "noopener";
      doc.body.appendChild(anchor);
      anchor.click();
      doc.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      const missingHeader = response.headers.get("X-Missing-Uploads");
      if (missingHeader) {
        const missingList = missingHeader
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);
        if (missingList.length > 0) {
          showAlert({
            title: "Einige Dateien fehlten",
            message: missingList.join("\n"),
          });
        }
      }

      showAlert({
        title: "Download gestartet",
        message: `${entries.length} Dateien werden als ZIP gespeichert.`,
      });

      return true;
    } catch (err: any) {
      console.error("gallery archive download failed", err);
      const message = err?.message || "Die Auswahl konnte nicht heruntergeladen werden.";
      showAlert({ title: "Download fehlgeschlagen", message });
      return false;
    }
  }, []);

  const toggleSelect = useCallback((filename: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (items.length === 0) {
        return prev;
      }
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map((item) => item.filename));
    });
  }, [items]);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedItems.length === 0) return;

    if (Platform.OS === "web" && selectedItems.length > 1) {
      const ok = await downloadArchive(selectedItems);
      if (ok) {
        clearSelection();
      }
      return;
    }

    let successCount = 0;
    const failed: string[] = [];
    for (const item of selectedItems) {
      const ok = await downloadMedia(item, { silent: true });
      if (ok) {
        successCount += 1;
      } else {
        failed.push(item.filename);
      }
    }

    clearSelection();

    if (successCount > 0) {
      showAlert({
        title: successCount === 1 ? "Download abgeschlossen" : "Downloads abgeschlossen",
        message:
          successCount === 1
            ? "Die Datei wurde in deiner Mediathek gespeichert."
            : `${successCount} Dateien wurden gespeichert.`,
      });
    }

    if (failed.length > 0) {
      showAlert({
        title: "Einige Downloads sind fehlgeschlagen",
        message: failed.join("\n"),
      });
    }
  }, [clearSelection, downloadArchive, downloadMedia, selectedItems]);

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerWrapper}>
        <ThemedView style={[styles.welcomeCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={[styles.welcomeIconWrapper, { backgroundColor: theme.primaryMuted }]}>
            <IconSymbol name="photo.on.rectangle" size={32} color={theme.primary} />
          </View>
          <ThemedText type="title" style={[styles.welcomeTitle, { color: theme.text }]}>
            Willkommen in der Galerie! 📸
          </ThemedText>
          <ThemedText style={[styles.welcomeMessage, { color: theme.textMuted }]}>
            Hier findet ihr alle gemeinsamen Momente eurer Party. Ladet eure Favoriten herunter, teilt sie mit Freunden
            oder stöbert einfach durch die schönsten Erinnerungen!
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.headerCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.headerTopRow}>
            <View style={[styles.headerIcon, { backgroundColor: theme.primaryMuted }]}>
              <IconSymbol name="photo.on.rectangle" size={28} color={theme.primary} />
            </View>
            <Button onPress={() => router.push("/upload")} iconText="arrow.up.circle" style={styles.headerUploadButton}>
              Upload starten
            </Button>
          </View>
          <View style={styles.columnSelectorWrapper}>
            <View style={styles.columnSliderHeader}>
              <ThemedText style={[styles.columnSelectorLabel, { color: theme.textMuted }]}>Darstellung</ThemedText>
              <ThemedText style={[styles.columnSliderDescription, { color: theme.text }]}>
                {sliderDescription}
              </ThemedText>
            </View>
            <View style={styles.columnSliderRow}>
              <TouchableOpacity
                onPress={() => handleColumnChange(null)}
                style={[
                  styles.columnAutoButton,
                  {
                    backgroundColor: userColumns === null ? theme.primary : theme.inputBackground,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.columnAutoButtonText,
                    { color: userColumns === null ? theme.background : theme.text },
                  ]}>
                  Auto
                </ThemedText>
              </TouchableOpacity>
              <View
                style={[styles.columnSliderTrack, { backgroundColor: theme.overlay }]}
                onLayout={(event) => {
                  const layoutWidth = event.nativeEvent.layout.width;
                  setSliderTrackWidth(layoutWidth);
                  const commitRatio =
                    sliderRange === 0 ? 0 : (sliderActiveValueRef.current - MIN_COLUMNS) / sliderRange;
                  sliderAnimatedFill.setValue(layoutWidth * commitRatio);
                  const maxThumb = Math.max(layoutWidth - SLIDER_THUMB_SIZE, 0);
                  const targetThumb = Math.min(
                    Math.max(layoutWidth * commitRatio - SLIDER_THUMB_SIZE / 2, 0),
                    maxThumb
                  );
                  sliderAnimatedThumb.setValue(targetThumb);
                }}
                accessibilityRole="adjustable"
                accessibilityLabel="Spaltenanzahl einstellen"
                accessibilityValue={{ text: `${sliderActiveValueRef.current} Spalten` }}
                accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
                onAccessibilityAction={handleSliderAccessibility}
                {...sliderPanResponder.panHandlers}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.columnSliderFill,
                    {
                      backgroundColor: theme.primary,
                      width: sliderAnimatedFill,
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.columnSliderThumb,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      shadowColor: theme.shadowColor,
                      transform: [{ translateX: sliderAnimatedThumb }],
                    },
                  ]}>
                  <View style={[styles.columnSliderThumbInner, { backgroundColor: theme.primary }]} />
                </Animated.View>
              </View>
              <View
                style={[styles.columnSliderValuePill, { backgroundColor: theme.overlay, borderColor: theme.border }]}>
                <ThemedText style={[styles.columnSliderValueText, { color: theme.text }]}>
                  {sliderColumnsDisplay} Spalten
                </ThemedText>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={toggleSelectAll}
            style={[styles.selectAllCheckbox, { borderColor: theme.border, backgroundColor: theme.card }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            accessibilityLabel="Alle Dateien auswählen">
            <IconSymbol
              name={allSelected ? "checkmark.circle" : "circle"}
              size={20}
              color={allSelected ? theme.primary : theme.textMuted}
            />
            <ThemedText style={[styles.selectAllCheckboxLabel, { color: theme.text }]}>
              {allSelected ? "Auswahl aufheben" : "Alles auswählen"}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    ),
    [
      allSelected,
      handleColumnChange,
      handleSliderAccessibility,
      router,
      sliderColumnsDisplay,
      sliderDescription,
      sliderPanResponder,
      sliderAnimatedFill,
      sliderAnimatedThumb,
      sliderRange,
      theme,
      toggleSelectAll,
      userColumns,
    ]
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>Galerie wird geladen …</ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol name="exclamationmark.triangle" size={24} color={theme.danger} />
          <ThemedText style={[styles.emptyText, { color: theme.danger }]}>{error}</ThemedText>
          <Button onPress={() => void loadItems()} iconText="arrow.clockwise" style={styles.retryButton}>
            Erneut versuchen
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <IconSymbol name="photo" size={24} color={theme.icon} />
        <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
          Noch keine Uploads vorhanden. Ladet eure ersten Erinnerungen hoch!
        </ThemedText>
      </View>
    );
  }, [error, loadItems, loading, theme]);

  const renderItem = useCallback(
    ({ item, index }: { item: GalleryUploadEntryDTO; index: number }) => {
      const mediaUri = `${assetsBase}${item.url}`;
      const isSelected = selected.has(item.filename);
      return (
        <TouchableOpacity
          onPress={() => {
            if (selectionMode) {
              toggleSelect(item.filename);
            } else {
              handleOpenViewer(index);
            }
          }}
          onLongPress={() => {
            toggleSelect(item.filename);
          }}
          style={[
            styles.mediaCard,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
              width: itemWidth,
              opacity: selectionMode && !isSelected ? 0.85 : 1,
            },
            isSelected ? [styles.mediaCardSelected, { borderColor: theme.primary }] : null,
          ]}>
          <View style={styles.thumbnailWrapper}>
            {isVideo(item.filename) ? (
              <Video
                source={{ uri: mediaUri }}
                style={styles.thumbnail}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                useNativeControls={false}
                isLooping
              />
            ) : (
              <Image source={{ uri: mediaUri }} style={styles.thumbnail} contentFit="cover" transition={200} />
            )}
            <View style={[styles.mediaBadge, { backgroundColor: theme.overlay }]}>
              <IconSymbol name={isVideo(item.filename) ? "play.circle.fill" : "photo"} size={16} color={theme.text} />
            </View>
          </View>
          <View style={styles.mediaFooter}>
            <ThemedText numberOfLines={1} style={[styles.mediaTitle, { color: theme.text }]}>
              {item.filename}
            </ThemedText>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                toggleSelect(item.filename);
              }}
              style={[
                styles.mediaCheckboxButton,
                {
                  backgroundColor: isSelected ? theme.primaryMuted : theme.card,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={isSelected ? "Auswahl entfernen" : "Auswahl hinzufügen"}>
              <IconSymbol
                name={isSelected ? "checkmark.circle" : "circle"}
                size={18}
                color={isSelected ? theme.primary : theme.icon}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [assetsBase, handleOpenViewer, itemWidth, selectionMode, selected, theme, toggleSelect]
  );
  const currentItem = items[currentIndex];
  const mediaUri = currentItem ? `${assetsBase}${currentItem.url}` : null;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const handleShowPrevious = useCallback(() => {
    setCurrentIndex((index) => (index <= 0 ? 0 : index - 1));
  }, []);

  const handleShowNext = useCallback(() => {
    setCurrentIndex((index) => {
      const lastIndex = Math.max(items.length - 1, 0);
      return index >= lastIndex ? lastIndex : index + 1;
    });
  }, [items.length]);

  const mediaDimensions = useMemo(() => {
    const fallbackRatio = currentItem
      ? isVideo(currentItem.filename)
        ? DEFAULT_VIDEO_RATIO
        : DEFAULT_IMAGE_RATIO
      : DEFAULT_IMAGE_RATIO;
    const ratio = currentItem ? mediaRatios[currentItem.filename] ?? fallbackRatio : fallbackRatio;

    const maxWidth = Math.max(viewerPageWidth - VIEWER_MEDIA_PADDING, MIN_MEDIA_WIDTH);
    let width = maxWidth;
    let height = width / ratio;

    if (height > MAX_MEDIA_HEIGHT) {
      height = MAX_MEDIA_HEIGHT;
      width = height * ratio;
    }

    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }

    if (width < MIN_MEDIA_WIDTH) {
      width = MIN_MEDIA_WIDTH;
      height = width / ratio;
    }

    if (height > MAX_MEDIA_HEIGHT) {
      height = MAX_MEDIA_HEIGHT;
      width = height * ratio;
    }

    return {
      width,
      height,
    };
  }, [currentItem, mediaRatios, viewerPageWidth]);

  const currentUploadedAt = currentItem?.uploadedAt ?? currentItem?.createdAt ?? currentItem?.updatedAt;
  const currentUploadedLabel = currentUploadedAt ? dateFormatter.format(new Date(currentUploadedAt)) : "Unbekannt";

  useEffect(() => {
    if (!currentItem || !isVideo(currentItem.filename)) {
      videoRef.current = null;
    }
  }, [currentItem]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <FlatList
          key={`gallery-${columns}`}
          data={items}
          keyExtractor={(item) => item.filename}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          numColumns={columns}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {selectionMode ? (
        <View pointerEvents="box-none" style={styles.selectionOverlayWrapper}>
          <ThemedView
            style={[
              styles.selectionBanner,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
                paddingBottom: insets.bottom + 12,
                marginBottom: 0,
              },
            ]}
            accessibilityLiveRegion="polite">
            <ThemedText style={[styles.selectionTitle, { color: theme.text }]}>
              {selectedCount} Datei{selectedCount === 1 ? "" : "en"} ausgewählt
            </ThemedText>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                onPress={toggleSelectAll}
                style={[styles.selectionActionButton, { borderColor: theme.border, backgroundColor: theme.overlay }]}
                accessibilityHint={allSelected ? "Auswahl aufheben" : "Alle Dateien auswählen"}>
                <IconSymbol name={allSelected ? "xmark.circle" : "checkmark.circle"} size={18} color={theme.primary} />
                <ThemedText style={[styles.selectionActionText, { color: theme.text }]}>
                  {allSelected ? "Auswahl aufheben" : "Alles auswählen"}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleDownloadSelected()}
                disabled={selectedCount === 0}
                style={[
                  styles.selectionActionButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.overlay,
                    opacity: selectedCount === 0 ? 0.6 : 1,
                  },
                ]}>
                <IconSymbol name="arrow.down.circle" size={18} color={theme.accent} />
                <ThemedText style={[styles.selectionActionText, { color: theme.accent }]}>Download</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearSelection}
                style={[styles.selectionActionButton, { borderColor: theme.border, backgroundColor: theme.overlay }]}
                accessibilityHint="Auswahl zurücksetzen">
                <IconSymbol name="trash.fill" size={18} color={theme.icon} />
                <ThemedText style={[styles.selectionActionText, { color: theme.text }]}>Auswahl leeren</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      ) : null}

      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={handleCloseViewer}>
        <TouchableWithoutFeedback onPress={handleCloseViewer}>
          <View style={[styles.viewerBackdrop, { backgroundColor: theme.backdrop }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.viewerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.viewerHeader}>
                  <TouchableOpacity onPress={handleCloseViewer} style={styles.viewerCloseButton}>
                    <IconSymbol name="xmark.circle" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.viewerHeaderRight}>
                    <ThemedText style={[styles.viewerCounter, { color: theme.text }]}>
                      {items.length === 0 ? "0/0" : `${currentIndex + 1}/${items.length}`}
                    </ThemedText>
                    {currentItem ? (
                      <TouchableOpacity
                        onPress={() => void downloadMedia(currentItem)}
                        style={[
                          styles.viewerDownloadButton,
                          { borderColor: theme.border, backgroundColor: theme.overlay },
                        ]}>
                        <IconSymbol name="arrow.down.circle" size={18} color={theme.accent} />
                        <ThemedText style={[styles.viewerDownloadText, { color: theme.accent }]}>Download</ThemedText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                {currentItem ? (
                  <>
                    <View style={styles.viewerMediaWrapper}>
                      {hasPrevious ? (
                        <TouchableOpacity
                          onPress={handleShowPrevious}
                          style={[styles.viewerNavButton, { backgroundColor: theme.overlay }]}
                          accessibilityRole="button"
                          accessibilityLabel="Vorheriges Medium">
                          <IconSymbol name="chevron-left" size={24} color={theme.text} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.viewerNavSpacer} />
                      )}

                      <View style={styles.viewerMediaContainer}>
                        {isVideo(currentItem.filename) ? (
                          <Video
                            ref={(instance) => {
                              videoRef.current = instance;
                            }}
                            source={{ uri: mediaUri ?? "" }}
                            style={[
                              styles.viewerMedia,
                              { width: mediaDimensions.width, height: mediaDimensions.height },
                            ]}
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={false}
                            useNativeControls
                            onLoad={(status: AVPlaybackStatus) => {
                              if (!status.isLoaded) return;
                              const naturalSize = (status as any)?.naturalSize;
                              const naturalWidth = naturalSize?.width ?? naturalSize?.naturalWidth;
                              const naturalHeight = naturalSize?.height ?? naturalSize?.naturalHeight;
                              rememberMediaRatio(currentItem.filename, naturalWidth, naturalHeight);
                            }}
                          />
                        ) : (
                          <Image
                            source={{ uri: mediaUri ?? "" }}
                            style={[
                              styles.viewerMedia,
                              { width: mediaDimensions.width, height: mediaDimensions.height },
                            ]}
                            contentFit="contain"
                            transition={200}
                            onLoad={({ source }) => {
                              rememberMediaRatio(currentItem.filename, source?.width, source?.height);
                            }}
                          />
                        )}
                      </View>

                      {hasNext ? (
                        <TouchableOpacity
                          onPress={handleShowNext}
                          style={[styles.viewerNavButton, { backgroundColor: theme.overlay }]}
                          accessibilityRole="button"
                          accessibilityLabel="Nächstes Medium">
                          <IconSymbol name="chevron-right" size={24} color={theme.text} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.viewerNavSpacer} />
                      )}
                    </View>

                    <View style={styles.viewerMeta}>
                      <ThemedText style={[styles.viewerMetaTitle, { color: theme.text }]}>Datei-Infos</ThemedText>
                      <ThemedText style={[styles.viewerMetaRow, { color: theme.textMuted }]} numberOfLines={1}>
                        Name: {currentItem.filename}
                      </ThemedText>
                      <ThemedText style={[styles.viewerMetaRow, { color: theme.textMuted }]}>
                        Hochgeladen: {currentUploadedLabel}
                      </ThemedText>
                      <ThemedText style={[styles.viewerMetaRow, { color: theme.textMuted }]}>
                        Größe: {formatBytes(currentItem.size)}
                      </ThemedText>
                      {currentItem.groupName ? (
                        <ThemedText style={[styles.viewerMetaRow, { color: theme.textMuted }]}>
                          Gruppe: {currentItem.groupName}
                        </ThemedText>
                      ) : null}
                      {currentItem.guestName ? (
                        <ThemedText style={[styles.viewerMetaRow, { color: theme.textMuted }]}>
                          Hochgeladen von: {currentItem.guestName}
                        </ThemedText>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <View style={styles.viewerPlaceholder}>
                    <ThemedText style={[styles.viewerPlaceholderText, { color: theme.textMuted }]}>
                      Keine Datei ausgewählt.
                    </ThemedText>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 160,
    paddingTop: 8,
  },
  row: {
    gap: 16,
  },
  headerWrapper: {
    gap: 12,
  },
  headerCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerUploadButton: {
    alignSelf: "stretch",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  columnSelectorWrapper: {
    gap: 8,
    marginTop: 4,
  },
  columnSelectorLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  columnSliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  columnSliderDescription: {
    fontSize: 14,
    fontWeight: "600",
  },
  columnSliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  columnAutoButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  columnAutoButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  columnSliderTrack: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    paddingHorizontal: 2,
    cursor: "pointer",
  },
  columnSliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
  },
  columnSliderThumb: {
    position: "absolute",
    top: 2,
    left: 0,
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  columnSliderThumbInner: {
    width: SLIDER_THUMB_SIZE - 12,
    height: SLIDER_THUMB_SIZE - 12,
    borderRadius: (SLIDER_THUMB_SIZE - 12) / 2,
  },
  columnSliderValuePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  columnSliderValueText: {
    fontSize: 13,
    fontWeight: "600",
  },
  columnSliderScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  columnSliderScaleText: {
    fontSize: 12,
  },
  selectAllCheckbox: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectAllCheckboxLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  welcomeCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 16,
    marginBottom: 4,
    marginTop: 8,
    alignItems: "center",
  },
  welcomeIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  welcomeMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  selectionBanner: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  selectionActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectionActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectionOverlayWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 0,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
  },
  retryButton: {
    marginTop: 8,
  },
  mediaCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingBottom: 12,
    marginBottom: 16,
  },
  mediaCardSelected: {
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  thumbnailWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  mediaBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mediaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  mediaCheckboxButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mediaCheckboxLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewerBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  viewerCard: {
    width: "100%",
    maxWidth: 860,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 16,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewerCounter: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewerDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewerDownloadText: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewerMediaWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
  },
  viewerNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.25)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  viewerMediaContainer: {
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  viewerMedia: {
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  viewerNavSpacer: {
    width: 48,
    height: 48,
  },
  viewerMeta: {
    gap: 6,
    paddingHorizontal: 8,
  },
  viewerMetaTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewerMetaRow: {
    fontSize: 14,
  },
  viewerPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  viewerPlaceholderText: {
    fontSize: 15,
    textAlign: "center",
  },
});
