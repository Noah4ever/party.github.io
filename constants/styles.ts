import { StyleSheet } from "react-native";
import { useTheme } from "./theme";

export function useGlobalStyles() {
  const theme = useTheme();
  return StyleSheet.create({
    button: {
      marginTop: 80,
      alignSelf: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    buttonText: {
      color: theme.text,
    },
  });
}
