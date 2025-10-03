import { Image } from "expo-image";
import { StyleSheet, TextInput } from "react-native";

import { Button } from "@/components/game/Button";
import { HintBox } from "@/components/game/HintBox";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useRouter } from "expo-router";
import { useState } from "react";

//TODO: ASH add questions
//TODO: ASH add save logic of answers in API hint routes.games.ts line 1043 post and at api.ts line 433 add method to post a answer
//TODO: ASH have logic so multiple question work
//TODO: ASH get funny questions list in FunnyQuestionApi list 434 and implement in text with useEffect and .then
export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [text, setText] = useState("");

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
          <ThemedText type="title">Finale Challenge!</ThemedText>
          <ThemedText type="defaultSemiBold">
            Fast geschafft beantworte noch diese Frage ! Frage:
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <TextInput
            style={globalStyles.inputField}
            onChangeText={setText}
            value={text}
          ></TextInput>
          <Button
            onPress={() => {
              // gameApi.createFunnyAnswer()
              // TODO: ASH implement correct api calll
              router.navigate("/game/password");
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
  midContainer: {
    padding: 20,
  },
  hintContainer: {
    padding: 20,
    textAlign: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
