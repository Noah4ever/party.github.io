import { Image } from "expo-image";
import { StyleSheet, TextInput } from "react-native";

import { Button } from "@/components/game/Button";
import { HintBox } from "@/components/game/HintBox";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { funnyQuestionApi, FunnyQuestionDTO } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

//TODO: ASH add questions

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<FunnyQuestionDTO[]>([]);
  const [questionCounter, setQuestionCounter] = useState<number>(0);
  const [guestId, setGuestId] = useState("");

  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const guestId = await AsyncStorage.getItem("guestId");
      if (guestId) {
        setGuestId(guestId);
      }
    })();
  }, []);

  useEffect(() => {
    funnyQuestionApi.list().then((res) => {
      if (res && Array.isArray(res)) {
        setQuestions(res);
        console.log(res);
      }
    });
  }, []);

  const currentQuestion = questions[questionCounter];

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
            Fast geschafft beantworte noch diese Fragen ! Frage:{" "}
            {questions && questions.length > 0 && currentQuestion.question}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.midContainer}>
          <TextInput
            ref={textInputRef}
            style={globalStyles.inputField}
            onChangeText={setText}
            value={text}
          ></TextInput>
          <Button
            onPress={async () => {
              if (!text.trim()) {
                alert("Bitte gebe etwas ein");
                textInputRef.current?.focus;
                return;
              }

              if (!currentQuestion?.id) {
                return;
              }

              try {
                await funnyQuestionApi.addAnswer(
                  currentQuestion.id,
                  text,
                  guestId
                );
                console.log("Antwort erfolgreich hinzugefügt");
                setText("");
                textInputRef.current?.clear();
              } catch (err) {
                console.error("Fehler beim Hinzufügen der Antwort:", err);
                return;
              }

              if (questionCounter + 1 >= questions.length) {
                router.navigate("/game/password");
              } else {
                setQuestionCounter((prev) => prev + 1);
                textInputRef.current?.focus();
              }
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
