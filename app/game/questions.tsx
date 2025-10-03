import { Button } from "@/components/game/Button";
import { HintBox } from "@/components/game/HintBox";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { gameApi, QuizQuestionDTO } from "@/lib/api";
import Checkbox from "expo-checkbox";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

//TODO: NOAH implement Modal
//TODO: TG maybe add pics to some questions

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([]);
  const [checkedAnswers, setCheckedAnswers] = useState<boolean[][]>([]);
  const [questionCounter, setQuestionCounter] = useState<number>(0);
  const [correctCounter, setCorrectCounter] = useState<number>(0);

  useEffect(() => {
    gameApi.getQuizQuestions().then((res) => {
      if (res && Array.isArray(res) && res[0].questions) {
        const qs: QuizQuestionDTO[] = res[0].questions;
        const shuffled = shuffleArray(qs);
        setQuestions(shuffled);
        console.log(shuffled);
        const initial = shuffled.map((q) =>
          new Array(q.answers.length).fill(false)
        );
        setCheckedAnswers(initial);
      }
    });
  }, []);

  const currentQuestion = questions[questionCounter];

  function shuffleArray<T>(array: T[]): T[] {
    // Erstelle eine Kopie, damit das Original nicht verändert wird
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // Zufälliger Index zwischen 0 und i
      [arr[i], arr[j]] = [arr[j], arr[i]]; // Elemente tauschen
    }
    return arr;
  }

  const toggleCheckbox = (answerIndex: number) => {
    setCheckedAnswers((prev) => {
      const updated = [...prev];
      const questionAnswers = [...updated[questionCounter]];
      questionAnswers[answerIndex] = !questionAnswers[answerIndex];
      updated[questionCounter] = questionAnswers;
      return updated;
    });
  };

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
          <ThemedText type="title">
            Frage {questionCounter + 1}/{questions && questions.length}
          </ThemedText>
          <ThemedText>
            Frage: {questions.length > 0 && currentQuestion.question}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.answerList}>
          {questions.length > 0 &&
            currentQuestion.answers.map((answer, index) => (
              <ThemedView
                key={answer.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Checkbox
                  value={checkedAnswers[questionCounter]?.[index] || false}
                  onValueChange={() => toggleCheckbox(index)}
                />
                <ThemedText style={{ marginLeft: 8 }}>{answer.text}</ThemedText>
              </ThemedView>
            ))}
        </ThemedView>

        <ThemedView>
          <Button
            onPress={() => {
              let allCorrect = true;
              currentQuestion.answers.forEach((answer, index) => {
                if (answer.correct != checkedAnswers[questionCounter][index]) {
                  allCorrect = false;
                  // question with id: index is wrong
                } else {
                  // question with id: index is correct
                }
              });
              // TODO: NOAH show red or green border for correct or false answer

              if (allCorrect) {
                // TODO: NOAH setTimout for delay so user sees what was wrong
                setCorrectCounter((prev) => prev + 1);
              }

              if (questionCounter + 1 >= questions.length) {
                if (correctCounter > questions.length / 4) {
                  // TODO: NOAH set time penalty route 25%
                } else if (correctCounter > questions.length / 2) {
                  // TODO: NOAH set time penalty route 50%
                }
                router.navigate("/game/questionary");
              } else {
                setQuestionCounter((prev) => prev + 1);
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
  answerList: {
    flexDirection: "column",
    alignItems: "center",
  },
  checkContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
