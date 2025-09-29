import GuestForm, { Guest } from "@/components/guest/GuestForm";
import { GuestDTO, guestsApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useCallback } from "react";

export default function AddGuest() {
  const router = useRouter();
  const createGuest = useCallback(
    async (g: Guest) => {
      const created = (await guestsApi.create({ name: g.name, clue1: g.clue1, clue2: g.clue2 })) as GuestDTO;
      // Could use event emitter / context to trigger list refresh; simplest: rely on focus refetch.

      router.back();
    },
    [router]
  );

  return (
    <GuestForm
      title="Add new Partymaus"
      submitLabel="Add Guest"
      onSubmit={createGuest}
      onCancel={() => router.back()}
    />
  );
}
