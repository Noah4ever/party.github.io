import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Button } from "@/components/game/Button";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { gameApi, type QuestionaryAnswerDTO, type QuestionaryQuestionDTO } from "@/lib/api";

export default function QuestionaryAnswersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionaryQuestionDTO[]>([]);

  const loadAnswers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await gameApi.getQuestionaryAnswers();
      const payload =
        response && typeof response === "object" && "questions" in response
          ? (response as { questions?: QuestionaryQuestionDTO[] }).questions
          : undefined;
      setQuestions(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("questionary answers load failed", err);
      setError("Antworten konnten nicht geladen werden. Versucht es gleich erneut.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnswers();
  }, [loadAnswers]);

  const totals = useMemo(() => {
    const totalAnswers = questions.reduce((sum, entry) => sum + entry.answers.length, 0);
    return {
      totalQuestions: questions.length,
      totalAnswers,
    };
  }, [questions]);

  return (
    <ThemedView style={styles.screen}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#BFDBFE", dark: "#1E293B" }}
        headerImage={
          <View style={styles.headerArt}>
            <Image source={require("@/assets/images/papa/flower.png")} style={styles.headerImage} />
            <View style={[styles.spark, styles.sparkOne]} />
            <View style={[styles.spark, styles.sparkTwo]} />
            <View style={[styles.spark, styles.sparkThree]} />
          </View>
        }>
        <ThemedView style={[styles.card, styles.heroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.heroHeader}>
            <ThemedText type="title">Fragebogen Antworten</ThemedText>
            <IconSymbol name="doc.text" size={26} color={theme.primary} />
          </View>
          <ThemedText style={[styles.heroText, { color: theme.textSecondary }]}>
            Hier findet ihr jede Antwort, die beim Fragebogen abgegeben wurde. Nehmt euch Zeit, stöbert durch die
            Highlights und lernt die anderen Teams noch besser kennen.
          </ThemedText>
          <View style={[styles.heroStats, { backgroundColor: theme.backgroundAlt, borderColor: theme.border }]}>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Fragen</ThemedText>
              <ThemedText type="subtitle" style={styles.statValue}>
                {totals.totalQuestions}
              </ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <ThemedText style={[styles.statLabel, { color: theme.textMuted }]}>Antworten</ThemedText>
              <ThemedText type="subtitle" style={styles.statValue}>
                {totals.totalAnswers}
              </ThemedText>
            </View>
          </View>
          <Button
            iconText="chevron-left"
            onPress={() => {
              router.back();
            }}
            style={styles.heroButton}>
            Zurück zum Finale
          </Button>
        </ThemedView>

        {loading ? (
          <View style={[styles.centerState, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.stateText, { color: theme.textMuted }]}>Antworten werden geladen …</ThemedText>
          </View>
        ) : error ? (
          <View style={[styles.centerState, { borderColor: theme.danger, backgroundColor: theme.card }]}>
            <IconSymbol name="exclamationmark.triangle" size={24} color={theme.danger} />
            <ThemedText style={[styles.stateText, { color: theme.danger }]}>{error}</ThemedText>
            <Button iconText="arrow.clockwise" onPress={loadAnswers} style={styles.retryButton}>
              Nochmal versuchen
            </Button>
          </View>
        ) : questions.length === 0 ? (
          <View style={[styles.centerState, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <IconSymbol name="text.bubble" size={24} color={theme.primary} />
            <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
              Es sind noch keine Antworten vorhanden. Schaut später noch einmal vorbei!
            </ThemedText>
          </View>
        ) : (
          questions.map((question) => (
            <ThemedView
              key={question.id}
              style={[styles.questionCard, { borderColor: theme.border, backgroundColor: theme.card }]}
              testID={`question-${question.id}`}>
              <View style={styles.questionHeader}>
                <IconSymbol name="questionmark.circle" size={22} color={theme.primary} />
                <ThemedText type="subtitle" style={styles.questionTitle}>
                  {question.question}
                </ThemedText>
              </View>
              <ThemedText style={[styles.answerCount, { color: theme.textMuted }]}>
                {question.answers.length === 1
                  ? "1 Antwort eingegangen"
                  : `${question.answers.length} Antworten eingegangen`}
              </ThemedText>
              {question.answers.length === 0 ? (
                <ThemedText style={[styles.emptyAnswers, { color: theme.textMuted }]}>
                  Noch keine Antworten – vielleicht beim nächsten Mal!
                </ThemedText>
              ) : (
                <View style={styles.answerList}>
                  {question.answers.map((answer: QuestionaryAnswerDTO) => (
                    <View key={answer.id} style={[styles.answerRow, { borderColor: theme.border }]}>
                      <View style={[styles.answerBullet, { backgroundColor: theme.primary }]} />
                      <View style={styles.answerContent}>
                        <ThemedText style={[styles.answerText, { color: theme.text }]}>{answer.answer}</ThemedText>
                        <ThemedText style={[styles.answerMeta, { color: theme.textMuted }]}>
                          {answer.groupName ? `${answer.groupName} · ` : ""}
                          {answer.guestName ?? "Anonym"}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ThemedView>
          ))
        )}
      </ParallaxScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerArt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerImage: {
    width: 180,
    height: 160,
    objectFit: "contain",
  },
  spark: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(251, 191, 36, 0.85)",
  },
  sparkOne: {
    top: 18,
    left: 60,
  },
  sparkTwo: {
    right: 52,
    bottom: 34,
  },
  sparkThree: {
    left: 90,
    bottom: 10,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  heroCard: {
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroText: {
    fontSize: 16,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  heroButton: {
    marginTop: 8,
  },
  centerState: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateText: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 4,
    width: "100%",
  },
  questionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  questionTitle: {
    flex: 1,
  },
  answerCount: {
    fontSize: 14,
  },
  emptyAnswers: {
    fontSize: 15,
  },
  answerList: {
    gap: 12,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  answerBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  answerContent: {
    flex: 1,
    gap: 6,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 22,
  },
  answerMeta: {
    fontSize: 14,
  },
});
