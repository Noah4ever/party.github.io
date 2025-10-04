import { Image } from "expo-image";
import { StyleSheet, TextInput, View } from "react-native";

import { Button } from "@/components/game/Button";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useTheme } from "@/constants/theme";
import { funnyQuestionApi, FunnyQuestionDTO } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

//TODO: ASH add questions

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const theme = useTheme();

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
          <View style={styles.partyHeader}>
            <View style={[styles.partyGlow, styles.partyGlowPrimary]} />
            <View style={[styles.partyGlow, styles.partyGlowSecondary]} />
            <Image
              source={require("@/assets/images/papa/crown.png")}
              style={styles.papaLogo}
            />
            <View style={[styles.confetti, styles.confettiOne]} />
            <View style={[styles.confetti, styles.confettiTwo]} />
            <View style={[styles.confetti, styles.confettiThree]} />
            <View style={[styles.confetti, styles.confettiFour]} />
          </View>
        }
      >
        <View
          style={[
            styles.heroCard,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <View style={styles.textContainer}>
            <ThemedText type="title">Finale Challenge!</ThemedText>
            <ThemedText type="defaultSemiBold">
              Fast geschafft beantworte noch diese Fragen !
            </ThemedText>
            <ThemedText>
              Frage:{" "}
              {questions && questions.length > 0 && currentQuestion.question}
            </ThemedText>
          </View>

          <View style={styles.midContainer}>
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
          </View>
        </View>
      </ParallaxScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  partyHeader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  partyGlow: {
    position: "absolute",
    borderRadius: 160,
    width: 260,
    height: 260,
    opacity: 0.55,
  },
  partyGlowPrimary: {
    backgroundColor: "rgba(236, 72, 153, 0.45)",
    left: 0,
  },
  partyGlowSecondary: {
    backgroundColor: "rgba(59, 130, 246, 0.35)",
    width: 200,
    height: 200,
    borderRadius: 140,
    left: 0,
  },
  partyCrown: {
    width: 200,
    height: 150,
    marginTop: 10,
  },
  confetti: {
    position: "absolute",
    width: 10,
    borderRadius: 4,
  },
  confettiOne: {
    height: 36,
    backgroundColor: "#F97316",
    top: 28,
    left: 50,
    transform: [{ rotate: "18deg" }],
  },
  confettiTwo: {
    height: 28,
    backgroundColor: "#6366F1",
    top: 24,
    right: 60,
    transform: [{ rotate: "-12deg" }],
  },
  confettiThree: {
    height: 22,
    backgroundColor: "#22C55E",
    bottom: 26,
    left: 190,
    transform: [{ rotate: "-28deg" }],
  },
  confettiFour: {
    height: 32,
    backgroundColor: "#FACC15",
    bottom: 18,
    right: 80,
    transform: [{ rotate: "24deg" }],
  },
  papaLogo: {
    height: 280,
    width: 230,
    bottom: 0,
    left: 0,
    top: 0,
    right: 0,
    position: "absolute",
  },
  textContainer: {
    gap: 15,
  },
  midContainer: {
    padding: 20,
    gap: 30,
  },
});
