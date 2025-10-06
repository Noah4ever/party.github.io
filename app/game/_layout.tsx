import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { withLayoutContext } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { createStackNavigator } from "@react-navigation/stack";
const{Navigator}=createStackNavigator();
const Stack = withLayoutContext(Navigator)

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false , animation:'slide_from_right', gestureEnabled:false}}>
        {/* Stack */}
        <Stack.Screen
          name="modal/camera"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="challenge_2" options={{ headerShown: false, }} />
        <Stack.Screen name="challenge_3" options={{ headerShown: false,  }} />
        <Stack.Screen name="challenge_4" options={{ headerShown: false,  }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
