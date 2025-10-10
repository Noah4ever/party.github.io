import { useTheme } from "@/constants/theme";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { ThemedText } from "../themed-text";
import { IconSymbol, IconSymbolName } from "../ui/icon-symbol";

interface ButtonType {
  onPress: () => void;
  children: React.ReactNode;
  iconText: IconSymbolName;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function Button({ onPress, children, iconText, style, disabled = false }: ButtonType) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.9}
      disabled={disabled}
      style={[
        styles.primaryAction,
        {
          backgroundColor: disabled ? theme.primaryMuted : theme.primary,
          opacity: disabled ? 0.7 : 1,
        },
        style,
      ]}
      onPress={onPress}>
      <IconSymbol name={iconText} size={22} color="#fff" />
      <ThemedText style={[styles.primaryActionText, { color: "#fff" }]}>{children}</ThemedText>
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
