import GuestForm, { Guest } from "@/components/guest/GuestForm";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GuestDTO, guestsApi } from "@/lib/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

export default function EditGuestModal() {
  const { guestId } = useLocalSearchParams<{ guestId?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState<Guest | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!guestId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const list = (await guestsApi.list()) as GuestDTO[]; // simple fetch-all; could add single endpoint later
        const found = list.find((g) => g.id === guestId);
        if (active)
          setGuest(found ? { id: found.id, name: found.name, clue1: found.clue1, clue2: found.clue2 } : undefined);
        if (!found) setError("Guest not found");
      } catch (e: any) {
        if (active) setError(e.message || "Failed to load guest");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [guestId]);

  const handleSave = useCallback(
    async (g: Guest) => {
      if (!g.id) return;
      const updated = (await guestsApi.update(g.id, { name: g.name, clue1: g.clue1, clue2: g.clue2 })) as GuestDTO;
      console.log(updated);
      router.replace("/admin");
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await guestsApi.remove(id);
      router.replace("/admin");
    },
    [router]
  );

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }
  if (error) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ThemedText>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <GuestForm
      title="Edit Partymaus"
      initialGuest={guest}
      submitLabel={"Save"}
      onSubmit={handleSave}
      onDelete={handleDelete}
      onCancel={() => router.back()}
    />
  );
}
