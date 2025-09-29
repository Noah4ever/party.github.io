import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { useCallback, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableHighlight,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export type Guest = { id?: string; name: string; clue1?: string; clue2?: string };

type Props = {
  title: string; // "Add new Partymaus" | "Edit Partymaus"
  initialGuest?: Guest; // empty = create
  submitLabel?: string; // "Add Guest" | "Save"
  onSubmit: (g: Guest) => void; // upsert
  onCancel?: () => void;
  onDelete?: (id: string) => Promise<void> | void; // optional external delete handler
  disabled?: boolean; // externally controlled disabled state
};

export default function GuestForm({
  title,
  initialGuest,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  onDelete,
  disabled,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState(initialGuest?.name ?? "");
  const [clue1, setClue1] = useState(initialGuest?.clue1 ?? "");
  const [clue2, setClue2] = useState(initialGuest?.clue2 ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit() {
    if (submitting || deleting || disabled) return;
    setSubmitting(true);
    try {
      // TODO: call your API for create/update here if needed
      // Example:
      // await fetch(`${API_BASE}/guests${initialGuest?.id ? '/' + initialGuest.id : ''}`, {
      //   method: initialGuest ? 'PUT' : 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name, clue1, clue2 })
      // });
      onSubmit({ id: initialGuest?.id, name, clue1, clue2 });
    } finally {
      setSubmitting(false);
    }
  }

  const confirmDelete = useCallback(() => {
    if (!initialGuest?.id || deleting) return;
    // Web fallback: Alert.alert on web only supports a single OK button, so use window.confirm for multi-button UX.
    if (Platform.OS === "web") {
      const confirmed = (globalThis as any).confirm?.(`Delete guest "${initialGuest.name}"? This cannot be undone.`);
      if (!confirmed) return;
      (async () => {
        try {
          setDeleting(true);
          if (onDelete) {
            await onDelete(initialGuest.id!);
          }
          onCancel?.();
        } finally {
          setDeleting(false);
        }
      })();
      return;
    }

    // Native / mobile platforms
    Alert.alert("Delete Guest", `Are you sure you want to delete \"${initialGuest.name}\"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            if (onDelete) {
              await onDelete(initialGuest.id!);
            }
            onCancel?.();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [initialGuest, onDelete, onCancel, deleting]);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.select({ ios: "padding", android: undefined, default: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 80, default: 0 })}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ThemedText type="title" style={styles.heading}>
              {title}
            </ThemedText>

            <View style={styles.form}>
              <TextInput
                placeholder="Name..."
                value={name}
                placeholderTextColor={theme.placeholder}
                onChangeText={setName}
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <TextInput
                placeholder="Clue 1..."
                value={clue1}
                placeholderTextColor={theme.placeholder}
                onChangeText={setClue1}
                style={styles.input}
                returnKeyType="next"
              />
              <TextInput
                placeholder="Clue 2..."
                value={clue2}
                placeholderTextColor={theme.placeholder}
                onChangeText={setClue2}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              {initialGuest && (
                <ThemedText
                  onPress={confirmDelete}
                  style={{
                    textAlign: "center",
                    color: theme.danger,
                    opacity: deleting ? 0.5 : 1,
                    textDecorationLine: "underline",
                  }}>
                  {deleting ? "Deleting..." : "Remove"}
                </ThemedText>
              )}

              <ThemedView
                style={{
                  marginTop: 20,
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "space-evenly",
                  flexDirection: "row",
                }}>
                {onCancel && (
                  <TouchableHighlight
                    style={[styles.button, { borderColor: theme.textMuted }]}
                    underlayColor={theme.textMuted + "22"}
                    onPress={onCancel}>
                    <ThemedText style={{ color: theme.textMuted }}>Cancel</ThemedText>
                  </TouchableHighlight>
                )}

                <TouchableHighlight
                  style={[styles.button, { borderColor: theme.primary, width: "50%", opacity: submitting ? 0.6 : 1 }]}
                  disabled={submitting || deleting || disabled}
                  underlayColor={theme.primaryMuted}
                  onPress={handleSubmit}>
                  <ThemedText style={{ color: theme.primary, textAlign: "center" }}>
                    {submitting ? "Saving..." : submitLabel}
                  </ThemedText>
                </TouchableHighlight>
              </ThemedView>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "flex-start", padding: 20 },
  heading: { marginTop: 20, marginBottom: 60 },
  scrollContent: { flexGrow: 1, alignItems: "center", paddingBottom: 40 },
  form: { width: "100%", maxWidth: 420, gap: 16 },
  input: {
    alignSelf: "center",
    width: "80%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfd3d6",
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#111",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  button: {
    marginTop: 40,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonText: {},
});
