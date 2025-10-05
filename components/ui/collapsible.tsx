import { PropsWithChildren, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function Collapsible({
  children,
  title,
}: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? "light";

  // Für smooth Rotation-Animation
  const rotation = new Animated.Value(isOpen ? 1 : 0);

  const toggleOpen = () => {
    Animated.timing(rotation, {
      toValue: isOpen ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const currentColors = theme === "light" ? Colors.light : Colors.dark;

  return (
    <ThemedView
      style={[
        styles.container,
        {
          borderColor: currentColors.border,
          backgroundColor: currentColors.card,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.heading}
        onPress={toggleOpen}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <IconSymbol
            name="chevron.right"
            size={20}
            weight="medium"
            color={currentColors.primary}
          />
        </Animated.View>

        <ThemedText
          type="defaultSemiBold"
          style={[styles.title, { color: currentColors.primary }]}
        >
          {isOpen ? "QR-Code verbergen" : title || "QR-Code anzeigen"}
        </ThemedText>
      </TouchableOpacity>

      {isOpen && <View style={styles.content}>{children}</View>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    marginTop: 10,
    marginLeft: 28,
  },
});
