import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Add",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.add" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: "control",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="joystick.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
