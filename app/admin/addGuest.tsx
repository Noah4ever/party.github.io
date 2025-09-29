import { useState } from "react";

import GuestForm, { Guest } from "@/components/guest/GuestForm";
import { useTheme } from "@/constants/theme";
import { useNavigation, useRouter } from "expo-router";

export default function AddGuest() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();

  const [name, setName] = useState("");
  const [clue1, setClue1] = useState("");
  const [clue2, setClue2] = useState("");

  function handleSubmit() {
    // You could send this to an API here
    alert(`Guest added: ${name}\nClue 1: ${clue1}\nClue 2: ${clue2}`);
    navigation.goBack();
  }

  return (
    <GuestForm
      title="Add new Partymaus"
      submitLabel="Add Guest"
      onSubmit={(g: Guest) => {
        // TODO: API/Create
        alert(`Guest added: ${g.name}\nClue1: ${g.clue1 ?? ""}\nClue2: ${g.clue2 ?? ""}`);
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
