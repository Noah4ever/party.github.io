import { Button } from "@/components/game/Button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { GalleryUploadEntryDTO, GalleryUploadListDTO, gameApi, getBaseUrl } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import { ResizeMode, Video } from "expo-av";
import { File as ExpoFile, Paths as ExpoPaths } from "expo-file-system";
import { Image } from "expo-image";
import { requestPermissionsAsync as requestMediaPermissionsAsync, saveToLibraryAsync } from "expo-media-library";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewToken,
  useWindowDimensions,
} from "react-native";

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi)$/i;

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
  const [items, setItems] = useState<GalleryUploadEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mediaPermissionGranted, setMediaPermissionGranted] = useState<boolean>(Platform.OS === "web");
  const viewerListRef = useRef<FlatList<GalleryUploadEntryDTO>>(null);

  const columns = useMemo(() => {
    if (width >= 1000) return 3;
    if (width >= 700) return 2;
    return 1;
  }, [width]);

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

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleOpenViewer = useCallback((index: number) => {
    setCurrentIndex(index);
    setViewerVisible(true);
    requestAnimationFrame(() => {
      viewerListRef.current?.scrollToIndex({ index, animated: false });
    });
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

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

  const handleDownloadSelected = useCallback(async () => {
    if (selectedItems.length === 0) return;

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
  }, [clearSelection, downloadMedia, selectedItems]);

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerWrapper}>
        <ThemedView style={[styles.headerCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.headerTopRow}>
            <View style={[styles.headerIcon, { backgroundColor: theme.primaryMuted }]}>
              <IconSymbol name="photo.on.rectangle" size={28} color={theme.primary} />
            </View>
            <Button onPress={() => router.push("/upload")} iconText="arrow.up.circle" style={styles.headerUploadButton}>
              Upload starten
            </Button>
          </View>
          <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>
            Gemeinsame Galerie
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Stöbert durch alle hochgeladenen Erinnerungen und ladet eure Favoriten herunter.
          </ThemedText>
        </ThemedView>

        {selectionMode ? (
          <ThemedView
            style={[styles.selectionBanner, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}
            accessibilityLiveRegion="polite">
            <ThemedText style={[styles.selectionTitle, { color: theme.text }]}>
              {selectedCount} Datei{selectedCount === 1 ? "" : "en"} ausgewählt
            </ThemedText>
            <View style={styles.selectionActions}>
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
                <IconSymbol name="xmark.circle" size={18} color={theme.icon} />
                <ThemedText style={[styles.selectionActionText, { color: theme.text }]}>Auswahl leeren</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        ) : null}
      </View>
    ),
    [
      clearSelection,
      handleDownloadSelected,
      router,
      selectionMode,
      selectedCount,
      theme.backgroundAlt,
      theme.border,
      theme.card,
      theme.primary,
      theme.primaryMuted,
      theme.accent,
      theme.icon,
      theme.overlay,
      theme.text,
      theme.textMuted,
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
      const marginRight = columns > 1 && index % columns !== columns - 1 ? 16 : 0;
      const uploadedAt = item.uploadedAt ?? item.createdAt ?? item.updatedAt;
      const uploadedLabel = uploadedAt ? dateFormatter.format(new Date(uploadedAt)) : "Unbekannt";
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
              marginRight,
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
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation();
              toggleSelect(item.filename);
            }}
            style={[
              styles.selectionToggle,
              {
                backgroundColor: isSelected ? theme.primaryMuted : theme.card,
                borderColor: isSelected ? theme.primary : theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={isSelected ? "Auswahl entfernen" : "Auswahl hinzufügen"}>
            <IconSymbol
              name={isSelected ? "checkmark.circle" : "circle"}
              size={22}
              color={isSelected ? theme.primary : theme.icon}
            />
          </TouchableOpacity>
          <View style={styles.mediaInfo}>
            <ThemedText numberOfLines={1} style={[styles.mediaTitle, { color: theme.text }]}>
              {item.filename}
            </ThemedText>
            <ThemedText style={[styles.mediaMeta, { color: theme.textMuted }]}>Hochgeladen: {uploadedLabel}</ThemedText>
            <ThemedText style={[styles.mediaMeta, { color: theme.textMuted }]}>
              Größe: {formatBytes(item.size)}
            </ThemedText>
            {item.groupName ? (
              <ThemedText style={[styles.mediaMeta, { color: theme.textMuted }]} numberOfLines={1}>
                Gruppe: {item.groupName}
              </ThemedText>
            ) : null}
            {item.guestName ? (
              <ThemedText style={[styles.mediaMeta, { color: theme.textMuted }]} numberOfLines={1}>
                Hochgeladen von: {item.guestName}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.mediaFooterRow}>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                void downloadMedia(item);
              }}
              style={[styles.inlineDownloadButton, { borderColor: theme.border, backgroundColor: theme.overlay }]}>
              <IconSymbol name="arrow.down.circle" size={18} color={theme.accent} />
              <ThemedText style={[styles.inlineDownloadText, { color: theme.accent }]}>Download</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [assetsBase, columns, dateFormatter, downloadMedia, handleOpenViewer, selectionMode, selected, theme, toggleSelect]
  );

  const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60 }), []);

  const handleViewableChange = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken<GalleryUploadEntryDTO>[];
      changed: ViewToken<GalleryUploadEntryDTO>[];
    }) => {
      const firstVisible = viewableItems.find((token) => typeof token.index === "number");
      if (firstVisible?.index != null) {
        setCurrentIndex(firstVisible.index);
      }
    },
    []
  );

  const currentItem = items[currentIndex];
  const currentUploadedAt = currentItem?.uploadedAt ?? currentItem?.createdAt ?? currentItem?.updatedAt;
  const currentUploadedLabel = currentUploadedAt ? dateFormatter.format(new Date(currentUploadedAt)) : "Unbekannt";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <FlatList
          key={columns}
          data={items}
          numColumns={columns}
          keyExtractor={(item) => item.filename}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={handleCloseViewer}>
        <TouchableWithoutFeedback onPress={handleCloseViewer}>
          <View style={[styles.viewerBackdrop, { backgroundColor: theme.backdrop }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.viewerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.viewerHeader}>
                  <TouchableOpacity onPress={handleCloseViewer} style={styles.viewerCloseButton}>
                    <IconSymbol name="xmark.circle" size={18} color={theme.text} />
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

                <FlatList
                  ref={viewerListRef}
                  data={items}
                  horizontal
                  pagingEnabled
                  initialNumToRender={1}
                  keyExtractor={(item) => item.filename}
                  renderItem={({ item }) => {
                    const uri = `${assetsBase}${item.url}`;
                    return (
                      <View style={[styles.viewerMediaContainer, { width: viewerPageWidth }]}>
                        {isVideo(item.filename) ? (
                          <Video
                            source={{ uri }}
                            style={styles.viewerMedia}
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay
                            useNativeControls
                          />
                        ) : (
                          <Image source={{ uri }} style={styles.viewerMedia} contentFit="contain" transition={200} />
                        )}
                      </View>
                    );
                  }}
                  onViewableItemsChanged={handleViewableChange}
                  viewabilityConfig={viewabilityConfig}
                  getItemLayout={(_data, index) => ({
                    length: viewerPageWidth,
                    offset: viewerPageWidth * index,
                    index,
                  })}
                  snapToInterval={viewerPageWidth}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                />

                {currentItem ? (
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
                ) : null}
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
    paddingBottom: 48,
    paddingTop: 8,
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
  selectionBanner: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
    gap: 12,
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
  selectionButton: {
    alignSelf: "stretch",
  },
  selectionButtonSecondary: {
    alignSelf: "stretch",
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
    flex: 1,
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
  selectionToggle: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
  },
  mediaInfo: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 6,
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  mediaMeta: {
    fontSize: 13,
  },
  mediaFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  inlineDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineDownloadText: {
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
  viewerMediaContainer: {
    width: 720,
    maxWidth: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerMedia: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  viewerMeta: {
    gap: 6,
  },
  viewerMetaTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewerMetaRow: {
    fontSize: 14,
  },
});
