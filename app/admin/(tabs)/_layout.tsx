import { Tabs } from "expo-router";
import React, { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdminTabBar from "@/components/admin/AdminTabBar";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: palette.primary,
      tabBarInactiveTintColor: palette.textMuted,
      tabBarButton: HapticTab,
      tabBarShowLabel: false,
      headerShown: false,
      animation: "shift" as const,
      sceneContainerStyle: {
        paddingBottom: insets.bottom,
        backgroundColor: palette.background,
      },
    }),
    [insets.bottom, palette.background, palette.primary, palette.textMuted]
  );

  return (
    <Tabs screenOptions={screenOptions} tabBar={(props) => <AdminTabBar {...props} palette={palette} />}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="people-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="person.2.square.stack" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="gamecontroller.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
