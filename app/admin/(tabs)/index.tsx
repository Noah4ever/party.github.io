import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableHighlight } from "react-native";

type Guest = { id: string; name: string; clue1?: string; clue2?: string };

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [guests, setGuests] = useState<Guest[]>([
    { id: "1", name: "John Doe", clue1: "Loves hiking", clue2: "Enjoys cooking" },
    { id: "2", name: "Jane Smith", clue1: "Avid reader", clue2: "Plays guitar" },
    { id: "3", name: "Max Mustermann", clue1: "Night owl", clue2: "Coffee lover" },
    { id: "4", name: "John Doe", clue1: "Loves hiking", clue2: "Enjoys cooking" },
    { id: "5", name: "Jane Smith", clue1: "Avid reader", clue2: "Plays guitar" },
    { id: "6", name: "Max Mustermann", clue1: "Night owl", clue2: "Coffee lover" },
    { id: "7", name: "Hummel Thierwes", clue1: "Loves hiking", clue2: "Enjoys cooking" },
    { id: "8", name: "Ashlii Drewes", clue1: "Avid reader", clue2: "Plays guitar" },
    { id: "9", name: "Noah Thiering", clue1: "Night owl", clue2: "Coffee lover" },
  ]);

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
      <ThemedView style={[styles.guestListContainer, { backgroundColor: theme.background }]}>
        {filteredGuests.map((guest) => (
          <ThemedView
            key={guest.id}
            style={{
              paddingInline: 12,
              borderRadius: 8,
              backgroundColor: theme.accent + "20",
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
      </ThemedView>
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
