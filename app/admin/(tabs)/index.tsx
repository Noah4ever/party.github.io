import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { ApiError, GuestDTO, guestsApi } from "@/lib/api";
import { Image } from "expo-image";
import { Link, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TextInput, TouchableHighlight } from "react-native";

type Guest = { id: string; name: string; clue1?: string; clue2?: string };

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await guestsApi.list()) as GuestDTO[];
      setGuests(data.map((g) => ({ id: g.id, name: g.name, clue1: g.clue1, clue2: g.clue2 })));
    } catch (e) {
      setError((e as ApiError).message || "Failed to load guests");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on screen focus (after returning from add/edit modals)
  const didInitialLoad = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (didInitialLoad.current) {
        load(); // subsequent focuses
      } else {
        didInitialLoad.current = true;
        load(); // initial focus
      }
    }, [load])
  );

  // (Optional) remove old initial useEffect if desired; kept no-op to avoid double fetch
  // useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = (await guestsApi.list()) as GuestDTO[];
      setGuests(data.map((g) => ({ id: g.id, name: g.name, clue1: g.clue1, clue2: g.clue2 })));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const filteredGuests = guests.filter((guest) => guest.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <ParallaxScrollView
      headerHeight={200}
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={<Image source={require("@/assets/images/admin-pic.png")} style={styles.topPicture} />}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Guest List</ThemedText>
      </ThemedView>
      <ThemedView style={styles.addContainer}>
        <Link href="/admin/addGuest">
          <Link.Trigger>
            <ThemedText
              style={{
                padding: 16,
                paddingBottom: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
              }}>
              <IconSymbol name="person.badge.plus" size={28} color="#FFF" />
            </ThemedText>
          </Link.Trigger>
        </Link>
      </ThemedView>

      <ThemedView style={styles.searchContainer}>
        <TextInput
          placeholder="Search guests..."
          placeholderTextColor={theme.placeholder}
          style={styles.searchInput}
          onChangeText={setSearchTerm}
        />
      </ThemedView>

      {/* List of added guests */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        <ThemedView style={[styles.guestListContainer, { backgroundColor: theme.background }]}>
          {error && <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>}
          {loading && guests.length === 0 && <ThemedText>Loading...</ThemedText>}
          {filteredGuests.map((guest) => (
            <ThemedView
              key={guest.id}
              style={{
                paddingInline: 12,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: theme.accent + "12",
                borderColor: theme.accent,
                borderWidth: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
              <ThemedText>{guest.name}</ThemedText>
              <ThemedView style={{ flexDirection: "row", gap: 2, backgroundColor: "transparent" }}>
                <TouchableHighlight
                  underlayColor={theme.accent + "1f"}
                  style={{ padding: 6, borderRadius: 6 }}
                  onPress={() => {
                    router.push(`/admin/qr/${guest.id}`);
                  }}>
                  <IconSymbol name="qr-code" size={22} color={theme.text} />
                </TouchableHighlight>
                <TouchableHighlight
                  underlayColor={theme.accent + "1f"}
                  style={{ padding: 6, borderRadius: 6 }}
                  onPress={() => {
                    router.push(`/admin/guest/${guest.id}`);
                  }}>
                  <IconSymbol name="ellipsis.vertical.circle.outline" size={22} color={theme.text} />
                </TouchableHighlight>
              </ThemedView>
            </ThemedView>
          ))}
          {!loading && filteredGuests.length === 0 && !error && (
            <ThemedText style={{ opacity: 0.7, textAlign: "center" }}>No guests yet. Click + to add one.</ThemedText>
          )}
        </ThemedView>
      </ScrollView>
    </ParallaxScrollView>
  );
}
const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfd3d6",
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#111",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  titleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  addContainer: {
    marginBlock: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  topPicture: {
    height: 200,
    width: 290,
    top: 0,
    left: 0,
    position: "absolute",
  },
  guestListContainer: {
    flex: 1,
    padding: 20,
    gap: 6,
  },
});
