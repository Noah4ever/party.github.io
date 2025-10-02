import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { confirm, showError } from "@/lib/dialogs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableHighlight,
  View,
} from "react-native";

export type Guest = {
  id?: string;
  name: string;
  clue1?: string;
  clue2?: string;
};

type Props = {
  title: string; // "Add new Partymaus" | "Edit Partymaus"
  initialGuest?: Guest; // empty = create
  submitLabel?: string; // "Add Guest" | "Save"
  onSubmit: (g: Guest) => Promise<void> | void; // upsert, may throw
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
  const [formError, setFormError] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput | null>(null);

  const inputsDisabled = useMemo(() => submitting || deleting || !!disabled, [submitting, deleting, disabled]);

  const containerStyle = useMemo<StyleProp<ViewStyle>>(
    () => [styles.container, { backgroundColor: theme.background }] as StyleProp<ViewStyle>,
    [theme.background]
  );

  type CardShadowStyle = ViewStyle & { boxShadow?: string };

  const cardShadow = useMemo<CardShadowStyle>(() => {
    if (Platform.OS === "web") {
      return { boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)" } as CardShadowStyle;
    }
    return {
      shadowColor: theme.shadowColor ?? "#000",
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    } as CardShadowStyle;
  }, [theme.shadowColor]);

  const cardStyle = useMemo<StyleProp<ViewStyle>>(
    () =>
      [
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.card,
        } as ViewStyle,
        cardShadow,
      ] as StyleProp<ViewStyle>,
    [cardShadow, theme.border, theme.card]
  );

  const inputStyle = useMemo<StyleProp<TextStyle>>(
    () =>
      [
        styles.input,
        {
          borderColor: theme.inputBorder,
          backgroundColor: theme.inputBackground,
          color: theme.inputText,
        } as TextStyle,
      ] as StyleProp<TextStyle>,
    [theme.inputBackground, theme.inputBorder, theme.inputText]
  );

  const cancelButtonStyle = useMemo<StyleProp<ViewStyle>>(
    () => [styles.button, { borderColor: theme.textMuted }] as StyleProp<ViewStyle>,
    [theme.textMuted]
  );

  const submitButtonStyle = useMemo<StyleProp<ViewStyle>>(
    () =>
      [
        styles.button,
        {
          borderColor: theme.primary,
          backgroundColor: theme.primaryMuted,
          opacity: submitting ? 0.65 : 1,
        } as ViewStyle,
      ] as StyleProp<ViewStyle>,
    [submitting, theme.primary, theme.primaryMuted]
  );

  const errorTextStyle = useMemo<StyleProp<TextStyle>>(
    () => [styles.errorText, { color: theme.danger }] as StyleProp<TextStyle>,
    [theme.danger]
  );

  const deleteTextStyle = useMemo<StyleProp<TextStyle>>(
    () =>
      [
        styles.deleteText,
        {
          color: theme.danger,
          opacity: deleting ? 0.5 : 1,
        } as TextStyle,
      ] as StyleProp<TextStyle>,
    [deleting, theme.danger]
  );

  const buttonTextMuted = useMemo<StyleProp<TextStyle>>(
    () => [styles.buttonText, { color: theme.textMuted }] as StyleProp<TextStyle>,
    [theme.textMuted]
  );

  const buttonTextPrimary = useMemo<StyleProp<TextStyle>>(
    () => [styles.buttonText, { color: theme.primary }] as StyleProp<TextStyle>,
    [theme.primary]
  );

  useEffect(() => {
    const input = nameInputRef.current;
    if (!input) return;

    const blurTimer = setTimeout(() => {
      input.blur();
      Keyboard.dismiss();
    }, 120);

    return () => clearTimeout(blurTimer);
  }, [initialGuest]);

  async function handleSubmit() {
    if (inputsDisabled) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({ id: initialGuest?.id, name, clue1, clue2 });
      Keyboard.dismiss();
    } catch (err: any) {
      const message = err?.message || "Something went wrong";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const confirmDelete = useCallback(async () => {
    if (!initialGuest?.id || deleting) return;
    const confirmed = await confirm({
      title: "Delete Guest",
      message: `Are you sure you want to delete "${initialGuest.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      setDeleting(true);
      if (onDelete) {
        await onDelete(initialGuest.id);
      }
      onCancel?.();
    } catch (err: any) {
      const message = err?.message || "Failed to delete";
      showError(message);
    } finally {
      setDeleting(false);
    }
  }, [initialGuest, deleting, onDelete, onCancel]);

  return (
    <ThemedView style={containerStyle}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.select({
          ios: "padding",
          android: undefined,
          default: undefined,
        })}
        keyboardVerticalOffset={Platform.select({ ios: 80, default: 0 })}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollBeginDrag={Keyboard.dismiss}>
          <ThemedView style={cardStyle}>
            <ThemedText type="title" style={styles.heading}>
              {title}
            </ThemedText>

            <View style={styles.form}>
              <TextInput
                placeholder="Name..."
                value={name}
                placeholderTextColor={theme.placeholder}
                onChangeText={(text) => {
                  setName(text);
                  if (formError) setFormError(null);
                }}
                style={inputStyle}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!inputsDisabled}
                ref={nameInputRef}
                selectionColor={theme.primary}
              />
              <TextInput
                placeholder="Clue 1..."
                value={clue1}
                placeholderTextColor={theme.placeholder}
                onChangeText={(text) => {
                  setClue1(text);
                  if (formError) setFormError(null);
                }}
                style={inputStyle}
                returnKeyType="next"
                editable={!inputsDisabled}
                selectionColor={theme.primary}
              />
              <TextInput
                placeholder="Clue 2..."
                value={clue2}
                placeholderTextColor={theme.placeholder}
                onChangeText={(text) => {
                  setClue2(text);
                  if (formError) setFormError(null);
                }}
                style={inputStyle}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!inputsDisabled}
                selectionColor={theme.primary}
              />
              {formError ? <ThemedText style={errorTextStyle}>{formError}</ThemedText> : null}
              {initialGuest && (
                <ThemedText onPress={confirmDelete} style={deleteTextStyle}>
                  {deleting ? "Deleting..." : "Remove"}
                </ThemedText>
              )}

              <ThemedView style={[styles.actions, { backgroundColor: theme.backgroundAlt }]}>
                {onCancel && (
                  <TouchableHighlight
                    style={cancelButtonStyle}
                    underlayColor={`${theme.textMuted}22`}
                    onPress={onCancel}>
                    <ThemedText style={buttonTextMuted}>Cancel</ThemedText>
                  </TouchableHighlight>
                )}

                <TouchableHighlight
                  style={submitButtonStyle}
                  disabled={inputsDisabled}
                  underlayColor={theme.primaryMuted}
                  onPress={handleSubmit}>
                  <ThemedText style={buttonTextPrimary}>{submitting ? "Saving..." : submitLabel}</ThemedText>
                </TouchableHighlight>
              </ThemedView>
            </View>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  keyboardAvoider: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 12,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 24,
  },
  heading: {
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  button: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
  },
  actions: {
    marginTop: 12,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  errorText: {
    textAlign: "center",
    fontWeight: "500",
  },
  deleteText: {
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
