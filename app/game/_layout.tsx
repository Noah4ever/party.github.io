import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="modal/camera"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen
          name="modal/selfie"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="challenge_2" options={{ headerShown: false }} />
        <Stack.Screen name="challenge_3" options={{ headerShown: false }} />
        <Stack.Screen name="challenge_4" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
