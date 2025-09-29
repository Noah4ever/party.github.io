import { StyleSheet, TouchableOpacity } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts, useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function TabTwoScreen() {
  const theme = useTheme();
  const { logout } = useAdminAuth();

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
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Control
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
          }}
        >
          <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
            Logout
          </ThemedText>
        </TouchableOpacity>
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
  },
});
