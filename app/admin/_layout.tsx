import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import type { ViewStyle } from "react-native";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/constants/theme";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <AdminAuthProvider>
      <RootLayoutInner />
    </AdminAuthProvider>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { token, initializing, authenticating, login, error, clearError } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (initializing) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 12 }}>Loading...</ThemedText>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setSubmitted(true);
    const success = await login(password.trim());
    if (success) {
      setSubmitted(false);
    } else {
      setPassword("");
    }
  };

  if (!token) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.centeredContainer, { backgroundColor: theme.background }]}>
          <ThemedView style={[styles.loginCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <ThemedText type="title" style={styles.loginTitle}>
              Admin Access
            </ThemedText>
            <ThemedText style={styles.loginDescription}>Enter the password to manage guests and games.</ThemedText>
            <TextInput
              value={password}
              onChangeText={(text) => {
                if (submitted) clearError();
                if (submitted) setSubmitted(false);
                setPassword(text);
              }}
              placeholder="Password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
              onSubmitEditing={handleSubmit}
              editable={!authenticating}
              style={[styles.input, { borderColor: theme.primary, color: theme.text }]}
            />
            {error ? <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText> : null}
            <View style={styles.loginButtonRow}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleSubmit}
                disabled={authenticating || password.trim().length === 0}
                style={[
                  styles.loginButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: authenticating || password.trim().length === 0 ? 0.6 : 1,
                  },
                ]}>
                {authenticating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.loginButtonText}>Sign in</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
          <StatusBar style="auto" />
        </KeyboardAvoidingView>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="addGuest" options={{ presentation: "modal", title: "Modal" }} />
        <Stack.Screen name="guest/[guestId]" options={{ presentation: "modal", title: "Modal" }} />
        <Stack.Screen name="qr/[guestId]" options={{ presentation: "modal", title: "QR Code" }} />
        <Stack.Screen name="control/never-have-i-ever" options={{ title: "Never Have I Ever", presentation: "card" }} />
        <Stack.Screen name="control/quiz-questions" options={{ title: "Quiz Question" }} />
        <Stack.Screen name="control/funny-questions" options={{ title: "Funny Question" }} />
        <Stack.Screen name="control/passwords" options={{ title: "Passwords" }} />
        <Stack.Screen name="control/uploads" options={{ title: "Uploads" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

type ShadowStyle = ViewStyle & { boxShadow?: string };

const loginCardShadow: ShadowStyle =
  Platform.OS === "web"
    ? { boxShadow: "0 18px 38px rgba(15, 23, 42, 0.18)" }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      };

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    gap: 16,
    ...loginCardShadow,
  },
  loginTitle: {
    textAlign: "center",
  },
  loginDescription: {
    textAlign: "center",
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  loginButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  loginButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  errorText: {
    textAlign: "center",
  },
});
