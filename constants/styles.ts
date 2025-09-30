import { StyleSheet } from "react-native";
import { useTheme } from "./theme";

export function useGlobalStyles() {
  const theme = useTheme();
  return StyleSheet.create({
    button: {
      marginTop: 80,
      alignSelf: "center",
      paddingHorizontal: 16,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    buttonText: {
      color: theme.text,
    },
    inputField:{
    padding: 10,
    height: 40,
    borderWidth: 1,
    borderColor:theme.inputBorder,
    color:theme.inputText,
    backgroundColor:theme.inputBackground,
    },
    checkBox:{
    margin:8,
    // TODO: add color checkbox
    }
  });
}
