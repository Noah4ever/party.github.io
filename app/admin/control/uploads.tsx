import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminApi, AdminUploadEntryDTO, ApiError, DeleteUploadsResponseDTO, getBaseUrl } from "@/lib/api";
import { confirm, showAlert } from "@/lib/dialogs";
import { ResizeMode, Video } from "expo-av";
import { Image } from "expo-image";

function getUploadsBaseUrl(): string {
  const base = getBaseUrl();
  return base.replace(/\/?api$/, "");
}

function getDocument(): any {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as any).document;
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm)$/i;

function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.test(filename);
}

function formatBytes(bytes?: number): string {
  if (!Number.isFinite(bytes) || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
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

export default function UploadsScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();
  const [uploads, setUploads] = useState<AdminUploadEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [previewItem, setPreviewItem] = useState<AdminUploadEntryDTO | null>(null);
  const [working, setWorking] = useState(false);

  const baseUrl = useMemo(() => getUploadsBaseUrl(), []);
  const downloadsSupported = Platform.OS === "web" && !!getDocument();
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    []
  );

  const formatDateTime = useCallback(
    (value?: Date | string | number | null) => {
      if (!value) return "Unbekannt";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "Unbekannt";
      return dateFormatter.format(date);
    },
    [dateFormatter]
  );

  const filteredUploads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return uploads;
    return uploads.filter((item) => {
      const haystack = [item.filename, item.groupName, item.groupId, item.guestName, item.guestId, item.challengeId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [uploads, searchQuery]);

  const selectedUploads = useMemo(() => uploads.filter((item) => selected.has(item.filename)), [uploads, selected]);
  const selectedCount = selectedUploads.length;
  const allFilteredSelected = useMemo(() => {
    if (filteredUploads.length === 0) return false;
    return filteredUploads.every((item) => selected.has(item.filename));
  }, [filteredUploads, selected]);

  const loadUploads = useCallback(async () => {
    setError(null);
    try {
      const ok = await ensureSession();
      if (!ok) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const response = (await adminApi.listUploads()) as { files?: AdminUploadEntryDTO[] };
      const validFiles = (response.files ?? []).filter((item) => !/\.txt$/i.test(item.filename));
      setUploads(validFiles);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load uploads";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ensureSession]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadUploads();
    }, [loadUploads])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadUploads();
  }, [loadUploads]);

  useEffect(() => {
    setSelected((prev) => {
      const validNames = new Set(uploads.map((item) => item.filename));
      const filtered = Array.from(prev).filter((name) => validNames.has(name));
      if (filtered.length === prev.size) {
        return prev;
      }
      return new Set(filtered);
    });
  }, [uploads]);

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

  const clearSelection = useCallback(() => {
    setSelected(() => new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const selectAll = !(filteredUploads.length > 0 && filteredUploads.every((item) => next.has(item.filename)));
      if (!selectAll) {
        filteredUploads.forEach((item) => next.delete(item.filename));
      } else {
        filteredUploads.forEach((item) => next.add(item.filename));
      }
      return next;
    });
  }, [filteredUploads]);

  const handleDownloadItems = useCallback(
    async (items: AdminUploadEntryDTO[]) => {
      if (items.length === 0) return;
      const doc = getDocument();
      if (!downloadsSupported || !doc || !doc.body) {
        showAlert({
          title: "Downloads nicht verfügbar",
          message: "Bitte nutze das Web-Dashboard, um Dateien herunterzuladen.",
        });
        return;
      }

      const triggerDownload = (blob: Blob, filename: string) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = doc.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        link.style.display = "none";
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      };

      if (items.length === 1) {
        const item = items[0];
        try {
          const response = await fetch(`${baseUrl}${item.url}`, {
            credentials: "include",
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const blob = await response.blob();
          triggerDownload(blob, item.filename);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unbekannter Fehler";
          showAlert({
            title: `Download fehlgeschlagen (${item.filename})`,
            message,
          });
        }
        return;
      }

      const filenames = items.map((item) => item.filename);
      try {
        const response = (await adminApi.archiveUploads(filenames)) as Response;
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const header = response.headers.get("content-disposition");
        const fallbackName = `uploads-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
        const zipName = getFilenameFromContentDisposition(header, fallbackName);
        triggerDownload(blob, zipName);

        const missingHeader = response.headers.get("X-Missing-Uploads");
        if (missingHeader) {
          const missingList = missingHeader
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
          if (missingList.length > 0) {
            showAlert({
              title: "Einige Dateien fehlten",
              message: `Nicht gefunden: ${missingList.join(", ")}`,
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        showAlert({
          title: "Download fehlgeschlagen",
          message,
        });
      }
    },
    [baseUrl, downloadsSupported]
  );

  const handleDeleteUploads = useCallback(
    async (filenames: string[], opts?: { onSuccess?: () => void }) => {
      if (filenames.length === 0) return;

      const confirmed = await confirm({
        title: filenames.length === 1 ? "Datei löschen?" : `${filenames.length} Dateien löschen?`,
        message:
          filenames.length === 1
            ? "Die ausgewählte Datei wird dauerhaft gelöscht."
            : "Die ausgewählten Dateien werden dauerhaft gelöscht.",
        confirmLabel: "Löschen",
        destructive: true,
      });

      if (!confirmed) return;

      const ok = await ensureSession({ silent: true });
      if (!ok) return;

      setWorking(true);
      try {
        const response = (await adminApi.deleteUploads(filenames)) as DeleteUploadsResponseDTO;
        if (response.deleted.length > 0) {
          const deletedSet = new Set(response.deleted);
          setUploads((prev) => prev.filter((item) => !deletedSet.has(item.filename)));
          setSelected((prev) => {
            const next = new Set(prev);
            response.deleted.forEach((filename) => next.delete(filename));
            return next;
          });
          opts?.onSuccess?.();
        }
        if (response.failed.length > 0) {
          const failedMessage = response.failed.map((entry) => `${entry.filename}: ${entry.error}`).join("\n");
          showAlert({ title: "Konnte nicht löschen", message: failedMessage });
        }
      } catch (err) {
        const apiError = err as ApiError;
        const message = apiError?.message || "Die Dateien konnten nicht gelöscht werden.";
        showAlert({ title: "Fehler", message });
      } finally {
        setWorking(false);
      }
    },
    [ensureSession]
  );

  const handleDeleteSelected = useCallback(() => {
    const filenames = selectedUploads.map((item) => item.filename);
    if (filenames.length === 0) return;
    void handleDeleteUploads(filenames, { onSuccess: () => clearSelection() });
  }, [clearSelection, handleDeleteUploads, selectedUploads]);

  const handleDownloadSelected = useCallback(() => {
    if (selectedUploads.length === 0) return;
    void handleDownloadItems(selectedUploads);
  }, [handleDownloadItems, selectedUploads]);

  const handleOpenPreview = useCallback((item: AdminUploadEntryDTO) => {
    setPreviewItem(item);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const selectAllLabel = allFilteredSelected ? "Auswahl aufheben" : "Alles auswählen";

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={{ marginTop: 12, color: theme.textMuted }}>Loading uploads…</ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <IconSymbol name="exclamationmark.triangle" size={28} color={theme.danger} />
          <ThemedText style={{ marginTop: 12, color: theme.danger, textAlign: "center" }}>{error}</ThemedText>
        </View>
      );
    }

    if (uploads.length === 0) {
      return (
        <View style={styles.centerContent}>
          <IconSymbol name="camera" size={28} color={theme.icon} />
          <ThemedText style={{ marginTop: 12, color: theme.textMuted, textAlign: "center" }}>
            No uploads found yet.
          </ThemedText>
        </View>
      );
    }

    if (filteredUploads.length === 0) {
      return (
        <View style={styles.centerContent}>
          <IconSymbol name="questionmark.circle" size={28} color={theme.icon} />
          <ThemedText style={{ marginTop: 12, color: theme.textMuted, textAlign: "center" }}>
            Keine Ergebnisse für deine Suche.
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.grid}>
        {filteredUploads.map((item) => {
          const uri = `${baseUrl}${item.url}`;
          const uploadedAt = item.uploadedAt ?? item.createdAt;
          const subtitleParts: string[] = [];
          if (item.groupName || item.groupId) {
            subtitleParts.push(`Group: ${item.groupName ?? item.groupId}`);
          }
          if (item.guestName || item.guestId) {
            subtitleParts.push(`Guest: ${item.guestName ?? item.guestId}`);
          }
          if (item.challengeId) {
            subtitleParts.push(`Challenge: ${item.challengeId}`);
          }

          const selectedFlag = selected.has(item.filename);
          const video = isVideoFile(item.filename);

          return (
            <Pressable
              key={item.filename}
              onPress={() => handleOpenPreview(item)}
              onLongPress={() => toggleSelect(item.filename)}
              style={({ pressed }) => [
                styles.card,
                { borderColor: theme.border, backgroundColor: theme.card, opacity: pressed ? 0.92 : 1 },
                selectedFlag ? [styles.cardSelected, { borderColor: theme.primary }] : null,
              ]}>
              <TouchableOpacity
                style={[styles.selectionToggle, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={(event) => {
                  event.stopPropagation();
                  toggleSelect(item.filename);
                }}>
                <IconSymbol
                  name={selectedFlag ? "checkmark.circle" : "circle"}
                  size={22}
                  color={selectedFlag ? theme.primary : theme.icon}
                />
              </TouchableOpacity>
              {video ? (
                <Video source={{ uri }} useNativeControls shouldPlay={false} resizeMode={ResizeMode.COVER} />
              ) : (
                <Image source={{ uri }} style={styles.image} contentFit="cover" transition={200} cachePolicy="memory" />
              )}
              <View style={styles.metaRow}>
                <ThemedText style={[styles.filename, { color: theme.text }]} numberOfLines={1}>
                  {item.filename}
                </ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                  {formatDateTime(uploadedAt)} Uhr
                </ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                  {formatBytes(item.size) || "Unbekannte Größe"}
                </ThemedText>
                {subtitleParts.length > 0 ? (
                  <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>{subtitleParts.join(" · ")}</ThemedText>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleDownloadItems([item]);
                  }}>
                  <IconSymbol name="arrow.down.circle" size={18} color={theme.accent} />
                  <ThemedText style={[styles.cardActionText, { color: theme.accent }]}>Download</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleDeleteUploads([item.filename], {
                      onSuccess: () => {
                        if (previewItem?.filename === item.filename) {
                          setPreviewItem(null);
                        }
                      },
                    });
                  }}>
                  <IconSymbol name="trash.fill" size={18} color={theme.danger} />
                  <ThemedText style={[styles.cardActionText, { color: theme.danger }]}>Löschen</ThemedText>
                </TouchableOpacity>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Uploads" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        <View style={styles.toolbar}>
          <View
            style={[
              styles.searchBox,
              {
                borderColor: theme.inputBorder,
                backgroundColor: theme.inputBackground,
              },
            ]}>
            <IconSymbol name="magnifyingglass" size={18} color={theme.icon} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Uploads durchsuchen…"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, { color: theme.inputText }]}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={[styles.clearSearchButton, { backgroundColor: theme.overlay }]}>
                <IconSymbol name="xmark.circle" size={18} color={theme.icon} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleSelectAll}
            disabled={filteredUploads.length === 0}
            style={[
              styles.toolbarButton,
              {
                backgroundColor: allFilteredSelected ? theme.primaryMuted : theme.overlay,
                borderColor: theme.border,
                opacity: filteredUploads.length === 0 ? 0.5 : 1,
              },
            ]}>
            <IconSymbol
              name={allFilteredSelected ? "xmark.circle" : "checkmark.circle"}
              size={18}
              color={theme.primary}
            />
            <ThemedText style={[styles.toolbarButtonText, { color: theme.text }]}>{selectAllLabel}</ThemedText>
          </TouchableOpacity>
        </View>

        {selectedCount > 0 ? (
          <View
            style={[
              styles.selectionBanner,
              {
                borderColor: theme.border,
                backgroundColor: theme.selection,
              },
            ]}>
            <ThemedText style={[styles.selectionText, { color: theme.text }]}>
              {selectedCount} Datei{selectedCount === 1 ? "" : "en"} ausgewählt
            </ThemedText>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                onPress={handleDownloadSelected}
                disabled={!downloadsSupported || working}
                style={[
                  styles.selectionButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: downloadsSupported ? theme.overlay : "transparent",
                    opacity: !downloadsSupported || working ? 0.5 : 1,
                  },
                ]}>
                <IconSymbol name="arrow.down.circle" size={18} color={theme.accent} />
                <ThemedText style={[styles.selectionButtonText, { color: theme.accent }]}>Download</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteSelected}
                disabled={working}
                style={[
                  styles.selectionButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.overlay,
                    opacity: working ? 0.5 : 1,
                  },
                ]}>
                <IconSymbol name="trash.fill" size={18} color={theme.danger} />
                <ThemedText style={[styles.selectionButtonText, { color: theme.danger }]}>Löschen</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearSelection}
                style={[styles.selectionButton, { borderColor: theme.border, backgroundColor: theme.overlay }]}>
                <IconSymbol name="xmark.circle" size={18} color={theme.icon} />
                <ThemedText style={[styles.selectionButtonText, { color: theme.text }]}>Auswahl leeren</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!downloadsSupported ? (
          <View style={[styles.infoBanner, { backgroundColor: theme.accentMuted, borderColor: theme.accent }]}>
            <IconSymbol name="info.circle" size={18} color={theme.accent} />
            <ThemedText style={[styles.infoBannerText, { color: theme.text }]}>
              Downloads sind nur im Web verfügbar.
            </ThemedText>
          </View>
        ) : null}

        {renderContent()}
      </ScrollView>

      <Modal visible={!!previewItem} transparent animationType="fade" onRequestClose={handleClosePreview}>
        <TouchableWithoutFeedback onPress={handleClosePreview}>
          <View style={[styles.previewBackdrop, { backgroundColor: theme.backdrop }]}>
            {previewItem ? (
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <TouchableOpacity style={styles.previewCloseButton} onPress={handleClosePreview}>
                    <IconSymbol name="xmark.circle" size={22} color={theme.danger} />
                  </TouchableOpacity>
                  {isVideoFile(previewItem.filename) ? (
                    <Video
                      source={{ uri: `${baseUrl}${previewItem.url}` }}
                      style={styles.previewMedia}
                      useNativeControls
                      shouldPlay
                      resizeMode={ResizeMode.CONTAIN}
                    />
                  ) : (
                    <Image
                      source={{ uri: `${baseUrl}${previewItem.url}` }}
                      style={styles.previewMedia}
                      contentFit="contain"
                      transition={200}
                    />
                  )}
                  <View style={styles.previewMeta}>
                    <ThemedText style={[styles.previewMetaRow, { color: theme.text }]}>
                      Datei: {previewItem.filename}
                    </ThemedText>
                    <ThemedText style={[styles.previewMetaRow, { color: theme.textMuted }]}>
                      Hochgeladen: {formatDateTime(previewItem.uploadedAt ?? previewItem.createdAt ?? Date.now())}
                    </ThemedText>
                    {previewItem.size ? (
                      <ThemedText style={[styles.previewMetaRow, { color: theme.textMuted }]}>
                        Größe: {formatBytes(previewItem.size)}
                      </ThemedText>
                    ) : null}
                    {previewItem.groupName || previewItem.groupId ? (
                      <ThemedText style={[styles.previewMetaRow, { color: theme.textMuted }]}>
                        Gruppe: {previewItem.groupName ?? previewItem.groupId}
                      </ThemedText>
                    ) : null}
                    {previewItem.guestName || previewItem.guestId ? (
                      <ThemedText style={[styles.previewMetaRow, { color: theme.textMuted }]}>
                        Gast: {previewItem.guestName ?? previewItem.guestId}
                      </ThemedText>
                    ) : null}
                    {previewItem.challengeId ? (
                      <ThemedText style={[styles.previewMetaRow, { color: theme.textMuted }]}>
                        Challenge: {previewItem.challengeId}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      onPress={() => {
                        if (!downloadsSupported) {
                          showAlert({
                            title: "Download nicht verfügbar",
                            message: "Bitte öffne das Dashboard im Browser, um Dateien herunterzuladen.",
                          });
                          return;
                        }
                        void handleDownloadItems([previewItem]);
                      }}
                      style={[
                        styles.previewActionButton,
                        { borderColor: theme.border, backgroundColor: theme.overlay },
                      ]}>
                      <IconSymbol name="arrow.down.circle" size={20} color={theme.accent} />
                      <ThemedText style={[styles.previewActionText, { color: theme.accent }]}>Download</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        void handleDeleteUploads([previewItem.filename], {
                          onSuccess: () => {
                            setPreviewItem(null);
                          },
                        });
                      }}
                      style={[
                        styles.previewActionButton,
                        { borderColor: theme.border, backgroundColor: theme.overlay },
                      ]}>
                      <IconSymbol name="trash.fill" size={20} color={theme.danger} />
                      <ThemedText style={[styles.previewActionText, { color: theme.danger }]}>Löschen</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            ) : null}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "flex-start",
    width: "100%",
  },
  card: {
    flexBasis: 260,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 220,
    maxWidth: 440,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  metaRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  filename: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardSelected: {
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  selectionToggle: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    zIndex: 2,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  cardActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchIcon: {
    opacity: 0.8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearSearchButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectionBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  selectionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  selectionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
  },
  previewBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  previewCard: {
    width: "100%",
    maxWidth: 720,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 16,
  },
  previewCloseButton: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  previewMedia: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  previewMeta: {
    gap: 6,
  },
  previewMetaRow: {
    fontSize: 14,
  },
  previewActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  previewActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewActionText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
