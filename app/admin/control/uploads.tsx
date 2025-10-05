import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminApi, AdminUploadEntryDTO, ApiError, getBaseUrl } from "@/lib/api";
import { Image } from "expo-image";

function getUploadsBaseUrl(): string {
  const base = getBaseUrl();
  return base.replace(/\/?api$/, "");
}

export default function UploadsScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();
  const [uploads, setUploads] = useState<AdminUploadEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => getUploadsBaseUrl(), []);

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
      setUploads(response.files ?? []);
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

    return (
      <View style={styles.grid}>
        {uploads.map((item) => {
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

          return (
            <ThemedView
              key={item.filename}
              style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Image source={{ uri }} style={styles.image} contentFit="cover" transition={200} cachePolicy="memory" />
              <View style={styles.metaRow}>
                <ThemedText style={[styles.filename, { color: theme.text }]} numberOfLines={1}>
                  {item.filename}
                </ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                  {new Date(uploadedAt).toLocaleString()}
                </ThemedText>
                {subtitleParts.length > 0 ? (
                  <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>{subtitleParts.join(" · ")}</ThemedText>
                ) : null}
              </View>
            </ThemedView>
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
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        {renderContent()}
      </ScrollView>
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
  },
  card: {
    width: 220,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
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
});
