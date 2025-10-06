import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false , animation:'fade'}}>
        {/* Stack */}
        <Stack.Screen
          name="modal/camera"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="challenge_2" options={{ headerShown: false, animation:'slide_from_bottom' }} />
        <Stack.Screen name="challenge_3" options={{ headerShown: false, animation:'fade' }} />
        <Stack.Screen name="challenge_4" options={{ headerShown: false, animation:'fade' }} />

      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
