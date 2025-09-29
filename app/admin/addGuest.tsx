import GuestForm, { Guest } from "@/components/guest/GuestForm";
import { ApiError, guestsApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useCallback } from "react";

export default function AddGuest() {
  const router = useRouter();
  const createGuest = useCallback(
    async (g: Guest) => {
      try {
        await guestsApi.create({
          name: g.name,
          clue1: g.clue1,
          clue2: g.clue2,
        });
        router.back();
      } catch (err) {
        const apiErr = err as ApiError;
        const message = apiErr?.message || "Failed to create guest";
        throw new Error(message);
      }
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
