import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";

import { Button } from "@/components/game/Button";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { groupsApi, type GroupDTO } from "@/lib/api";

const headerColors = { light: "#FDE68A", dark: "#1F2937" };

export default function GroupNameScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [initialName, setInitialName] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const storedGroupId = await AsyncStorage.getItem("groupId");
        const storedName = await AsyncStorage.getItem("groupName");

        if (!mounted) return;

        if (storedGroupId) {
          setGroupId(storedGroupId);
        }

        if (storedName) {
          setInitialName(storedName);
          setNameInput(storedName);
        }

        if (storedGroupId) {
          try {
            const groups = await groupsApi.list();
            if (!mounted) return;
            const match = (groups as GroupDTO[]).find((group) => group.id === storedGroupId);
            if (match && match.name) {
              setInitialName(match.name);
              setNameInput(match.name);
            }
          } catch (listError) {
            console.warn("group-name load groups failed", listError);
          }
        }

        if (!storedGroupId) {
          setError("Wir konnten eure Gruppe nicht finden. Scannt noch einmal euren Partner.");
        }
      } catch (err) {
        console.error("group-name load failed", err);
        if (mounted) {
          setError("Etwas ist schiefgelaufen. Versucht es gleich erneut.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const trimmedName = useMemo(() => nameInput.trim(), [nameInput]);
  const nameTooShort = trimmedName.length < 3;

  const hasChanges = useMemo(() => {
    return trimmedName !== initialName.trim();
  }, [trimmedName, initialName]);

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }
    if (!groupId) {
      setError("Keine Gruppe gefunden. Scannt euren Partner erneut.");
      return;
    }
    if (nameTooShort) {
      setError("Euer Teamname braucht mindestens 3 Zeichen.");
      return;
    }
    if (!hasChanges) {
      router.navigate("/game/challenge_3");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = { name: trimmedName };
      await groupsApi.update(groupId, payload);
      await AsyncStorage.setItem("groupName", trimmedName);
      setInitialName(trimmedName);
      router.navigate("/game/challenge_3");
    } catch (err) {
      console.error("group-name save failed", err);
      setError("Der Teamname konnte nicht gespeichert werden. Prüft eure Verbindung und versucht es erneut.");
    } finally {
      setSaving(false);
    }
  }, [saving, groupId, nameTooShort, hasChanges, trimmedName, router]);

  return (
    <ThemedView style={styles.screen}>
      <ParallaxScrollView
        headerBackgroundColor={headerColors}
        headerHeight={180}
        headerImage={
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPink]} />
            <View style={[styles.partyGlow, styles.partyGlowBlue]} />
            <Image source={require("@/assets/images/crown.png")} style={styles.partyCrown} contentFit="contain" />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
          </View>
        }>
        <ThemedView style={[styles.card, styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>
              Gebt euch einen Teamnamen <HelloWave />
            </ThemedText>
            <ThemedText type="subtitle" style={[styles.subtitleText, { color: theme.textSecondary }]}>
              Macht eure Duo-Identität offiziell
            </ThemedText>
          </View>
          <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
            Nutzt die Chance, euch einen legendären Namen zu geben. Der Name erscheint in der Bestenliste und im Finale.
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.loadingText, { color: theme.textMuted }]}>
                Wir laden eure Gruppendaten …
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="subtitle" style={styles.sectionHeading}>
                  Teamname wählen
                </ThemedText>
                <IconSymbol name="text.bubble" size={20} color={theme.primary} />
              </View>
              <ThemedText style={[styles.sectionIntro, { color: theme.textSecondary }]}>
                Euer Name sollte mindestens drei Zeichen haben. Kreativ, lustig oder mysteriös - ganz wie ihr wollt.
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundAlt },
                ]}
                placeholder="z. B. Die Party-Legenden"
                placeholderTextColor={theme.textMuted}
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
                autoCorrect
                maxLength={40}
                editable={!saving}
                testID="group-name-input"
              />
              <View style={[styles.helperRow, { justifyContent: "space-between" }]}>
                <ThemedText style={[styles.helperText, { color: nameTooShort ? theme.danger : theme.textMuted }]}>
                  {nameTooShort ? "Mindestens 3 Zeichen" : "Wird im Leaderboard angezeigt"}
                </ThemedText>
                <ThemedText style={[styles.helperText, { color: theme.textMuted }]}>{trimmedName.length}/40</ThemedText>
              </View>
              {error ? (
                <View
                  style={[styles.errorBox, { borderColor: theme.danger, backgroundColor: "rgba(248,113,113,0.12)" }]}>
                  <IconSymbol name="exclamationmark.triangle" size={18} color={theme.danger} />
                  <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
                </View>
              ) : null}
              <View style={styles.actionsRow}>
                <Button onPress={handleSave} iconText="checkmark.circle">
                  {saving ? "Speichern …" : "Teamname speichern"}
                </Button>
              </View>
            </>
          )}
        </ThemedView>

        {/* <HintBox>Tipp: Ein starker Name motiviert – und macht es dem Moderator leichter, euch anzufeuern!</HintBox> */}
      </ParallaxScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 16,
    marginHorizontal: 0,
    marginBottom: 0,
    width: "100%",
    alignSelf: "center",
    maxWidth: 720,
  },
  heroCard: {
    gap: 18,
    marginTop: 24,
  },
  titleRow: {
    flexDirection: "column",
    gap: 12,
  },
  titleText: {
    flexWrap: "wrap",
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: "600",
  },
  leadText: {
    fontSize: 16,
    lineHeight: 22,
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontSize: 18,
  },
  sectionIntro: {
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  helperText: {
    fontSize: 13,
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  secondaryAction: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
  },
  secondaryActionText: {
    fontSize: 18,
    fontWeight: "700",
  },
  partyHeader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  partyGlow: {
    position: "absolute",
    borderRadius: 200,
    width: 260,
    height: 260,
    opacity: 0.55,
  },
  partyGlowPink: {
    backgroundColor: "rgba(236,72,153,0.4)",
    transform: [{ translateX: -30 }],
  },
  partyGlowBlue: {
    backgroundColor: "rgba(59,130,246,0.35)",
    transform: [{ translateX: 60 }, { translateY: 20 }],
  },
  partyCrown: {
    width: 210,
    height: 150,
  },
  confetti: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
  },
  confettiOne: {
    height: 34,
    backgroundColor: "#F59E0B",
    top: 30,
    left: 60,
    transform: [{ rotate: "18deg" }],
  },
  confettiTwo: {
    height: 26,
    backgroundColor: "#22C55E",
    top: 40,
    right: 70,
    transform: [{ rotate: "-16deg" }],
  },
  confettiThree: {
    height: 30,
    backgroundColor: "#8B5CF6",
    bottom: 30,
    right: 90,
    transform: [{ rotate: "32deg" }],
  },
});
