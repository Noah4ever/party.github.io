import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { Fonts, useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, adminApi } from "@/lib/api";
import { useRouter } from "expo-router";

type ControlItem = {
  key: string;
  title: string;
  description: string;
  icon: IconSymbolName;
  route: string;
};

const ITEMS: ControlItem[] = [
  {
    key: "never-have-i-ever",
    title: "Never Have I Ever",
    description: "Manage statements",
    icon: "list.bullet", // SF Symbol style mapped via IconSymbol
    route: "/admin/control/never-have-i-ever",
  },
  {
    key: "quiz-questions",
    title: "Quiz Questions",
    description: "Manage questions & answers",
    icon: "questionmark.circle",
    route: "/admin/control/quiz-questions",
  },
  {
    key: "funny-question",
    title: "Funny Questions",
    description: "Questions & guest answers",
    icon: "text.bubble",
    route: "/admin/control/funny-questions",
  },
  {
    key: "passwords",
    title: "Passwords",
    description: "Configure game passwords",
    icon: "lock.circle",
    route: "/admin/control/passwords",
  },
];

export default function TabTwoScreen() {
  const theme = useTheme();
  const { logout, ensureSession } = useAdminAuth();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

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

  const handleClearAllData = useCallback(async () => {
    const ok = await ensureSession({ silent: true });
    if (!ok) {
      showAlert("Session expired", "Please sign in again to clear all data.");
      return;
    }
    setClearing(true);
    try {
      await adminApi.clearAllData();
      showAlert("Data cleared", "All guests, groups, and game progress data have been removed.");
    } catch (error) {
      const apiError = error as ApiError;
      const message = apiError?.message || "Unable to clear data right now.";
      showAlert("Failed to clear data", message);
    } finally {
      setClearing(false);
    }
  }, [ensureSession, showAlert]);

  const confirmClearAllData = useCallback(() => {
    if (Platform.OS === "web") {
      const confirmed = typeof window !== "undefined" && window.confirm(
        "This will permanently delete all guests, groups, questions, and progress. This action cannot be undone."
      );
      if (confirmed) {
        void handleClearAllData();
      }
      return;
    }

    Alert.alert(
      "Clear all data?",
      "This will permanently delete all guests, groups, questions, and progress. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => {
            void handleClearAllData();
          },
        },
      ]
    );
  }, [handleClearAllData]);

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
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Control Center
        </ThemedText>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void logout()}
          style={{
            marginLeft: "auto",
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: theme.danger,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}>
          <IconSymbol name="logout" size={18} color={"#fff"} style={{ marginRight: 8 }} />
          <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Logout</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={[styles.listContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <FlatList
          data={ITEMS}
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
              onPress={() => router.push(item.route as any)}
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

      <ThemedView
        style={[
          styles.listContainer,
          styles.dangerListContainer,
          { backgroundColor: theme.card, borderColor: theme.danger },
        ]}>
        <Pressable
          accessibilityRole="button"
          onPress={confirmClearAllData}
          disabled={clearing}
          style={({ pressed }) => [
            styles.row,
            styles.dangerRow,
            {
              backgroundColor: pressed ? theme.backgroundAlt : theme.card,
              opacity: clearing ? 0.6 : 1,
            },
          ]}>
          <ThemedView
            style={[
              styles.iconWrapper,
              styles.dangerIconWrapper,
              { backgroundColor: theme.danger, borderColor: theme.danger },
            ]}>
            {clearing ? (
              <ActivityIndicator size="small" color={theme.background} />
            ) : (
              <IconSymbol name="trash.fill" size={20} color={theme.background} />
            )}
          </ThemedView>
          <View style={styles.rowContent}>
            <ThemedText type="defaultSemiBold" style={{ color: theme.danger }}>
              Clear all data
            </ThemedText>
            <ThemedText style={{ color: theme.textMuted, fontSize: 13, lineHeight: 18 }}>
              Deletes all guests, groups, questions, passwords, and funny answers.
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={16} color={theme.danger} />
        </Pressable>
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
    gap: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  listContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  dangerListContainer: {
    marginTop: 32,
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
