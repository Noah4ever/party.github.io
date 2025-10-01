import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, GuestDTO, guestsApi } from "@/lib/api";
import { Image } from "expo-image";
import { Link, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Guest = { id: string; name: string; clue1?: string; clue2?: string };
type FetchMode = "initial" | "refresh" | "silent";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuests = useCallback(
    async (mode: FetchMode = "initial") => {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      try {
        const ok = await ensureSession({ silent: mode !== "initial" });
        if (!ok) return;
        const data = (await guestsApi.list()) as GuestDTO[];
        setGuests(data.map((g) => ({ id: g.id, name: g.name, clue1: g.clue1, clue2: g.clue2 })));
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError?.message || "Failed to load guests");
      } finally {
        if (mode === "initial") setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      }
    },
    [ensureSession]
  );

  const didInitialLoad = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (didInitialLoad.current) {
        void fetchGuests("silent");
      } else {
        didInitialLoad.current = true;
        void fetchGuests("initial");
      }
    }, [fetchGuests])
  );

  const onRefresh = useCallback(() => {
    void fetchGuests("refresh");
  }, [fetchGuests]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredGuests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter((guest) => guest.name.toLowerCase().includes(term));
  }, [guests, searchTerm]);

  return (
    <ParallaxScrollView
      headerHeight={200}
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={<Image source={require("@/assets/images/admin-pic.png")} style={styles.topPicture} />}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Guests</ThemedText>
        <ThemedView style={styles.addContainer}>
          <Link href="/admin/addGuest">
            <ThemedView
              accessibilityRole="button"
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                },
              ]}>
              <IconSymbol name="plus" size={16} color={theme.background} />
              <ThemedText style={{ color: theme.background, fontWeight: "600" }}>New Guest</ThemedText>
            </ThemedView>
          </Link>
        </ThemedView>
      </ThemedView>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }>
        <ThemedView style={[styles.listCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedView style={[styles.searchContainer, { backgroundColor: theme.backgroundAlt }]}>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search guests..."
              placeholderTextColor={theme.placeholder}
              style={[
                styles.searchInput,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                },
              ]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </ThemedView>

          {error ? <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText> : null}

          {loading && guests.length === 0 ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={theme.accent} />
              <ThemedText style={{ color: theme.textMuted }}>Loading guests…</ThemedText>
            </View>
          ) : null}

          {!loading && filteredGuests.length === 0 && !error ? (
            <View style={styles.stateContainer}>
              <IconSymbol name="person.crop.circle.badge.plus" size={32} color={theme.icon} />
              <ThemedText style={[styles.emptyStateText, { color: theme.textMuted }]}>
                No guests yet. Tap “New Guest” to add one.
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.listSection}>
            {filteredGuests.map((guest) => {
              const clues = [guest.clue1, guest.clue2].filter(Boolean) as string[];
              return (
                <Pressable
                  key={guest.id}
                  onPress={() => router.push(`/admin/guest/${guest.id}`)}
                  style={({ pressed }) => [
                    styles.guestRow,
                    {
                      backgroundColor: pressed ? theme.backgroundAlt : theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedView
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: theme.primaryMuted,
                        borderColor: theme.border,
                      },
                    ]}>
                    <IconSymbol name="person.fill" size={20} color={theme.primary} />
                  </ThemedView>
                  <View style={styles.rowContent}>
                    <ThemedText type="defaultSemiBold">{guest.name}</ThemedText>
                    {clues.length > 0 ? (
                      <View style={styles.clueRow}>
                        {clues.map((clue, index) => (
                          <ThemedText
                            key={`${guest.id}-clue-${index}`}
                            style={{ color: theme.textMuted, fontSize: 13 }}
                            numberOfLines={1}>
                            {clue}
                          </ThemedText>
                        ))}
                      </View>
                    ) : (
                      <ThemedText style={{ color: theme.textMuted, fontSize: 13 }}>No clues yet</ThemedText>
                    )}
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.actionButton, { borderColor: theme.border }]}
                      onPress={(event) => {
                        event.stopPropagation();
                        router.push(`/admin/qr/${guest.id}`);
                      }}>
                      <IconSymbol name="qr-code" size={18} color={theme.icon} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.actionButton, { borderColor: theme.border }]}
                      onPress={(event) => {
                        event.stopPropagation();
                        router.push(`/admin/guest/${guest.id}`);
                      }}>
                      <IconSymbol name="ellipsis.vertical.circle" size={18} color={theme.icon} />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>
      </ScrollView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  titleContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  addContainer: {
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topPicture: {
    height: 200,
    width: 290,
    top: 0,
    left: 0,
    position: "absolute",
  },
  listContent: {
    gap: 16,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 16,
  },
  listSection: {
    gap: 10,
  },
  stateContainer: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  emptyStateText: {
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  clueRow: {
    gap: 0,
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
