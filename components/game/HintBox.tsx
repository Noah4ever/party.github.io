import { useTheme } from "@/constants/theme";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "../themed-text";

export function HintBox({ children }: { children?: any }) {
  const theme = useTheme();

  return (
    <View
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingInline: 20,
        paddingBottom: 20,
      }}
    >
      <ThemedText style={[styles.hintContainer, { borderColor: theme.danger }]}>
        {children ?? "PS: Schummeln ist für Loser, es geht hier um Spaß!"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hintContainer: {
    padding: 20,
    textAlign: "center",
    borderRadius: 10,
    borderWidth: 2,
  },
});
