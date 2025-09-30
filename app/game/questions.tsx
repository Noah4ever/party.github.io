import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity } from "react-native";

import { HintBox } from "@/components/game/HintBox";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { Checkbox } from "expo-checkbox";
import { useRouter } from "expo-router";
import React, { useState } from "react";

//TODO: style checkboxes
//TODO: add logic to questions and save right and wrong (maybe need 6 right ones or so and a reset)
//TODO: maybe add pics to some questions

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [isChecked, setChecked] = useState(false);

  const [questionCounter, setQuestionCounter] = useState(0);
  const questions = [
    {
      question: "Frage?",
      answers: [
        { id: 1, text: "Answer1" },
        { id: 2, text: "Answer2" },
        { id: 3, text: "Answer3" },
        { id: 4, text: "Answer4" },
      ],
      correct: 1,
    },
    {
      question: "Frage2?",
      answers: [
        { id: 1, text: "Answers21" },
        { id: 2, text: "Answers22" },
        { id: 3, text: "Answers23" },
        { id: 4, text: "Answers24" },
      ],
      correct: 2,
    },
  ];

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
          <ThemedText type="title">Frage 1/15</ThemedText>
          <ThemedText type="defaultSemiBold">
            Es gibt nur eine Auswahlmöglichkeit!
          </ThemedText>
          <ThemedText>Frage: {questions[questionCounter].question}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.answerList}>
          {questions[questionCounter].answers.map((question) => {
            return (
              <ThemedView key={question.id} style={styles.checkContainer}>
                <Checkbox
                  style={globalStyles.checkBox}
                  value={isChecked}
                  onValueChange={setChecked}
                />
                <ThemedText type="normal">{question.text}</ThemedText>
              </ThemedView>
            );
          })}
        </ThemedView>

        <ThemedView>
          <TouchableOpacity
            style={globalStyles.button}
            onPress={() => {
              // TODO: check if correct question is picked
              router.navigate("/game/questionary");
            }}
          >
            <ThemedText style={globalStyles.buttonText}>Check</ThemedText>
          </TouchableOpacity>
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
