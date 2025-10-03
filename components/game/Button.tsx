import { useTheme } from "@/constants/theme";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "../themed-text";
import { IconSymbol, IconSymbolName } from "../ui/icon-symbol";

interface ButtonType {
  onPress: () => void;
  children: React.ReactNode;
  iconText: IconSymbolName;
}

export function Button({ onPress, children, iconText }: ButtonType) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.primaryAction, { backgroundColor: theme.primary }]}
      onPress={onPress}
    >
      <IconSymbol name={iconText} size={22} color="#fff" />
      <ThemedText style={[styles.primaryActionText, { color: "#fff" }]}>
        {children}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryAction: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  primaryActionText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
