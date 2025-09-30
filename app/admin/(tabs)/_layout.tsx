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
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: { height: 60 },
        tabBarIconStyle: {
          marginTop: 0,
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <IconSymbol size={32} name="people-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          tabBarIcon: ({ color }) => (
            <IconSymbol size={32} name="gamecontroller.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ color }) => (
            <IconSymbol size={32} name="person.2.square.stack" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
