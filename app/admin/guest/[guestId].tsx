import GuestForm, { Guest } from "@/components/guest/GuestForm";
import { useLocalSearchParams, useRouter } from "expo-router";

// TODO: Ersetze das durch deinen echten Store/Fetcher
function useGuestById(id?: string) {
  // fake demo: lade aus irgendeiner Quelle
  if (!id) return undefined;
  return { id, name: "Jane Smith", clue1: "Avid reader", clue2: "Guitar" } as Guest;
}

export default function EditGuestModal() {
  const { guestId } = useLocalSearchParams<{ guestId?: string }>();
  const router = useRouter();
  const guest = useGuestById(guestId);

  return (
    <GuestForm
      title="Edit Partymaus"
      initialGuest={guest}
      submitLabel={"Save"}
      onSubmit={(g: Guest) => {
        // TODO: API/Update (id in g.id)
        alert(`Saved: ${g.name}`);
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
