import { Image } from "expo-image";
import { StyleSheet, TextInput } from "react-native";

import { Button } from "@/components/game/Button";
import { HintBox } from "@/components/game/HintBox";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { passwordGameApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

//TODO: NOAH Button spacing

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [validPasswords, setValidPasswords] = useState<String[]>([]);
  const [input, setInput] = useState("");
  useEffect(() => {
    passwordGameApi.get().then((res) => {
      console.log(res);
      if (res && "validPasswords" in res && res.validPasswords)
        setValidPasswords(res.validPasswords);
    });
  }, []);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <Image
            source={require("@/assets/images/crown.png")}
            style={styles.papaLogo}
          />
        }
      >
        <ThemedView style={styles.textContainer}>
          <ThemedText type="title">Fast am Ziel!</ThemedText>
          <ThemedText type="defaultSemiBold">
            Bringt nun den Gastgeber einen Shot und trinkt mit ihn, mit etwas
            Glück und Charm wird er euch den Schlüssel verraten!
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.midContainer}>
          <TextInput
            style={globalStyles.inputField}
            onChangeText={setInput}
            value={input}
          ></TextInput>
          <Button
            onPress={() => {
              for (const password of validPasswords) {
                if (
                  password.toUpperCase().trim() == input.toUpperCase().trim()
                ) {
                  router.navigate("/game/final");
                  //TODO: NOAH add cool input field
                }
              }
              console.log("FALSE");
              // TODO: NOAH shake and red border WRONG PASSWORD
            }}
            iconText="arrow.right.circle"
          >
            Abgeben!
          </Button>
        </ThemedView>
      </ParallaxScrollView>
      <HintBox />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  papaLogo: {
    height: 180,
    width: 290,
    bottom: 0,
    top: 0,
    right: 0,
    position: "absolute",
  },
  textContainer: {
    gap: 20,
  },
  midContainer: {},
  hintContainer: {
    padding: 20,
    textAlign: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
