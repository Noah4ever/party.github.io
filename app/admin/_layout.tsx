import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="addGuest" options={{ presentation: "modal", title: "Modal" }} />
        <Stack.Screen name="guest/[guestId]" options={{ presentation: "modal", title: "Modal" }} />
        <Stack.Screen name="qr/[guestId]" options={{ presentation: "modal", title: "QR Code" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
