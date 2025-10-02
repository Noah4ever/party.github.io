import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useThemePreference } from "@/contexts/ThemePreferenceContext";
import { ApiError, adminApi } from "@/lib/api";
import { useRouter } from "expo-router";

type ControlItem = {
  key: string;
  title: string;
  description: string;
  icon: IconSymbolName;
  type: "navigation" | "action" | "danger";
  route?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const NAVIGATION_ITEMS: ControlItem[] = [
  {
    key: "never-have-i-ever",
    title: "Never Have I Ever",
    description: "Manage statements",
    icon: "list.bullet", // SF Symbol style mapped via IconSymbol
    route: "/admin/control/never-have-i-ever",
    type: "navigation",
  },
  {
    key: "quiz-questions",
    title: "Quiz Questions",
    description: "Manage questions & answers",
    icon: "questionmark.circle",
    route: "/admin/control/quiz-questions",
    type: "navigation",
  },
  {
    key: "funny-question",
    title: "Funny Questions",
    description: "Questions & guest answers",
    icon: "text.bubble",
    route: "/admin/control/funny-questions",
    type: "navigation",
  },
  {
    key: "passwords",
    title: "Passwords",
    description: "Configure game passwords",
    icon: "lock.circle",
    route: "/admin/control/passwords",
    type: "navigation",
  },
];

const GAME_FLOW_ITEMS: ControlItem[] = [
  {
    key: "start-games",
    title: "Start or reset games",
    description: "Launch the party or roll back the game state",
    icon: "play.circle.fill",
    route: "/admin/control/start-games",
    type: "navigation",
  },
];

export default function TabTwoScreen() {
  const theme = useTheme();
  const { logout, ensureSession } = useAdminAuth();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const { colorScheme: activeScheme, toggleTheme, isUsingSystem } = useThemePreference();

  const showAlert = useCallback((title: string, message?: string) => {
    if (Platform.OS === "web") {
      const content = message ? `${title}\n\n${message}` : title;
      if (typeof window !== "undefined") {
        window.alert(content);
      }
      return;
    }
    Alert.alert(title, message);
  }, []);

  const handleDownloadData = useCallback(async () => {
    if (!isWeb) {
      showAlert("Not available", "Downloading a JSON backup is currently supported on the web dashboard.");
      return;
    }

    const ok = await ensureSession({ silent: true });
    if (!ok) {
      showAlert("Session expired", "Please sign in again to export data.");
      return;
    }

    setDownloading(true);
    try {
      const data = await adminApi.downloadData();
      if (typeof window === "undefined" || typeof document === "undefined") {
        showAlert("Download unavailable", "Unable to access browser download functionality.");
        return;
      }
      const fileName = `party-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showAlert("Download started", "Your JSON backup should begin downloading shortly.");
    } catch (error) {
      const apiError = error as ApiError;
      const message = apiError?.message || "Unable to download the dataset.";
      showAlert("Export failed", message);
    } finally {
      setDownloading(false);
    }
  }, [ensureSession, isWeb, showAlert]);

  const handleImportData = useCallback(() => {
    if (!isWeb) {
      showAlert("Not available", "Importing a JSON backup is currently supported on the web dashboard.");
      return;
    }
    if (typeof document === "undefined") {
      showAlert("Import unavailable", "Unable to access the file picker in this environment.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const ok = await ensureSession({ silent: true });
        if (!ok) {
          showAlert("Session expired", "Please sign in again to import data.");
          return;
        }
        setImporting(true);
        await adminApi.importData(parsed);
        showAlert("Import complete", "The dataset has been replaced successfully.");
      } catch (error) {
        if (error instanceof SyntaxError) {
          showAlert("Invalid file", "The selected file does not contain valid JSON.");
        } else {
          const apiError = error as ApiError;
          const message = apiError?.message || "Unable to import the dataset.";
          showAlert("Import failed", message);
        }
      } finally {
        setImporting(false);
      }
      if (target) {
        target.value = "";
      }
    };

    input.click();
  }, [ensureSession, isWeb, showAlert]);

  const controlItems = useMemo<ControlItem[]>(() => {
    const isDark = activeScheme === "dark";
    const themeToggle: ControlItem = {
      key: "toggle-theme",
      title: isDark ? "Switch to light theme" : "Switch to dark theme",
      description: isUsingSystem
        ? "Currently following your device settings"
        : `Currently using the ${activeScheme} theme`,
      icon: isDark ? "sun.max.fill" : "moon.fill",
      type: "action",
      onPress: toggleTheme,
    };

    const downloadItem: ControlItem = {
      key: "download-data",
      title: "Download backup (.json)",
      description: isWeb ? "Exports the full dataset as a JSON file." : "Available on the web dashboard.",
      icon: "arrow.down.circle",
      type: "action",
      onPress: handleDownloadData,
      disabled: downloading,
      loading: downloading,
    };

    const importItem: ControlItem = {
      key: "import-data",
      title: "Import dataset (.json)",
      description: isWeb ? "Replaces all data with the contents of a JSON backup." : "Available on the web dashboard.",
      icon: "arrow.up.circle",
      type: "action",
      onPress: handleImportData,
      disabled: importing,
      loading: importing,
    };

    const clearAll: ControlItem = {
      key: "clear-all-data",
      title: "Clear all data",
      description: "Requires confirmation code before wiping everything.",
      icon: "trash.fill",
      type: "danger",
      route: "/admin/control/clear-data",
    };

    return [themeToggle, downloadItem, importItem, clearAll];
  }, [activeScheme, downloading, handleDownloadData, handleImportData, importing, isUsingSystem, isWeb, toggleTheme]);

  const handleItemPress = useCallback(
    (item: ControlItem) => {
      if (item.disabled) return;
      if (item.route) {
        router.push(item.route as any);
        return;
      }
      if (item.onPress) {
        item.onPress();
      }
    },
    [router]
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Control</ThemedText>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void logout()}
          style={[
            styles.primaryButton,
            {
              marginLeft: "auto",
              backgroundColor: theme.danger,
            },
          ]}>
          <IconSymbol name="logout" size={18} color={"#fff"} style={{ marginRight: 8 }} />
          <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Logout</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={[styles.listContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <FlatList
          data={NAVIGATION_ITEMS}
          scrollEnabled={false}
          keyExtractor={(item) => item.key}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: theme.border,
                marginLeft: 60,
              }}
            />
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleItemPress(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.backgroundAlt : theme.card,
                },
              ]}>
              <ThemedView
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: theme.primaryMuted,
                    borderColor: theme.border,
                  },
                ]}>
                <IconSymbol name={item.icon} size={22} color={theme.primary} />
              </ThemedView>
              <View style={styles.rowContent}>
                <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 13, lineHeight: 18 }}>
                  {item.description}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color={theme.icon} />
            </Pressable>
          )}
        />
      </ThemedView>

      <ThemedView style={[styles.listContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <FlatList
          data={GAME_FLOW_ITEMS}
          scrollEnabled={false}
          keyExtractor={(item) => item.key}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: theme.border,
                marginLeft: 60,
              }}
            />
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleItemPress(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.backgroundAlt : theme.card,
                },
              ]}>
              <ThemedView
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: theme.accentMuted,
                    borderColor: theme.border,
                  },
                ]}>
                <IconSymbol name={item.icon} size={24} color={theme.accent} />
              </ThemedView>
              <View style={styles.rowContent}>
                <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 13, lineHeight: 18 }}>
                  {item.description}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color={theme.icon} />
            </Pressable>
          )}
        />
      </ThemedView>

      <ThemedView
        style={[
          styles.listContainer,
          styles.actionsListContainer,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}>
        <FlatList
          data={controlItems}
          scrollEnabled={false}
          keyExtractor={(item) => item.key}
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: 60 }} />
          )}
          renderItem={({ item }) => {
            const isDanger = item.type === "danger";
            const isAction = item.type === "action";
            const disabled = item.disabled ?? false;
            const iconBackground = isDanger ? theme.danger : isAction ? theme.accentMuted : theme.primaryMuted;
            const iconBorder = isDanger ? theme.danger : theme.border;
            const iconColor = isDanger ? theme.text : isAction ? theme.accent : theme.primary;
            const rightIconColor = isDanger ? theme.danger : theme.icon;

            return (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => handleItemPress(item)}
                style={({ pressed }) => [
                  styles.row,
                  isDanger && styles.dangerRow,
                  {
                    backgroundColor: pressed ? theme.backgroundAlt : theme.card,
                    opacity: disabled ? 0.6 : 1,
                  },
                ]}>
                <ThemedView
                  style={[
                    styles.iconWrapper,
                    isDanger && styles.dangerIconWrapper,
                    {
                      backgroundColor: iconBackground,
                      borderColor: iconBorder,
                    },
                  ]}>
                  {item.loading ? (
                    <ActivityIndicator size="small" color={iconColor} />
                  ) : (
                    <IconSymbol name={item.icon} size={isDanger ? 20 : 22} color={iconColor} />
                  )}
                </ThemedView>
                <View style={styles.rowContent}>
                  <ThemedText type="defaultSemiBold" style={isDanger ? { color: theme.danger } : undefined}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={{ color: theme.textMuted, fontSize: 13, lineHeight: 18 }}>
                    {item.description}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={16} color={rightIconColor} />
              </Pressable>
            );
          }}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionsListContainer: {
    marginTop: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dangerRow: {
    borderColor: "transparent",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  dangerIconWrapper: {
    borderWidth: 0,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
});
