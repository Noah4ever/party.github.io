import { Button } from "@/components/game/Button";
import { PopupModal } from "@/components/game/hint";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { Theme } from "@/constants/theme";
import { useTheme } from "@/constants/theme";
import { gameApi, QuizQuestionDTO } from "@/lib/api";
import { showAlert } from "@/lib/dialogs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Checkbox } from "expo-checkbox";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const PENALTY_SECONDS_MINOR = 60;
const PENALTY_SECONDS_MAJOR = 180;
const ADVANCE_DELAY_SUCCESS = 900;
const ADVANCE_DELAY_ERROR = 1300;

type AnswerFeedback = "neutral" | "correct" | "incorrect" | "missed";
const headerColors = { light: "#FDE68A", dark: "#1F2937" };

export default function QuizScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([]);
  const [checkedAnswers, setCheckedAnswers] = useState<boolean[][]>([]);
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<
    Record<string, AnswerFeedback[]>
  >({});
  const [questionCounter, setQuestionCounter] = useState(0);
  const [correctCounter, setCorrectCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [resultNotice, setResultNotice] = useState<{
    status: "correct" | "incorrect";
    message: string;
  } | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [finalSummary, setFinalSummary] = useState<{
    correct: number;
    total: number;
    penaltySeconds: number;
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const summaryStats = useMemo(() => {
    if (!finalSummary) {
      return null as null | { incorrect: number; incorrectPercent: number };
    }
    const incorrect = Math.max(finalSummary.total - finalSummary.correct, 0);
    const incorrectPercent =
      finalSummary.total > 0
        ? Math.round((incorrect / finalSummary.total) * 100)
        : 0;
    return { incorrect, incorrectPercent };
  }, [finalSummary]);

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setModalVisible(true);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const loadQuestions = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLocked(false);
    setResultNotice(null);
    setQuizComplete(false);
    setFinalSummary(null);
    setQuestionCounter(0);
    setCorrectCounter(0);
    setFeedbackByQuestion({});
    setCheckedAnswers([]);
    setLoading(true);
    setError(null);

    try {
      const res = await gameApi.getQuizQuestions();
      if (!isMountedRef.current) {
        return;
      }
      if (
        res &&
        Array.isArray(res) &&
        res.length > 0 &&
        Array.isArray(res[0]?.questions)
      ) {
        const qs = shuffleArray(res[0]!.questions);
        setQuestions(qs);
        setCheckedAnswers(
          qs.map((q) => new Array(q.answers.length).fill(false))
        );
      } else {
        setQuestions([]);
        setCheckedAnswers([]);
      }
    } catch (err) {
      console.error("quiz load failed", err);
      if (isMountedRef.current) {
        setError(
          "Quiz konnte nicht geladen werden. Versucht es gleich nochmal."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    (async () => {
      const storedGroupId = await AsyncStorage.getItem("groupId");
      if (storedGroupId) {
        setGroupId(storedGroupId);
      }
    })();
  }, []);

  const currentQuestion = useMemo(
    () => questions[questionCounter],
    [questions, questionCounter]
  );
  const totalQuestions = questions.length;
  const currentAnswers = useMemo(() => {
    if (!currentQuestion) {
      return [] as boolean[];
    }
    return checkedAnswers[questionCounter] ?? [];
  }, [checkedAnswers, currentQuestion, questionCounter]);
  const answerStatuses = currentQuestion
    ? feedbackByQuestion[currentQuestion.id] ?? []
    : [];
  const hasSelections = currentAnswers.some(Boolean);

  const toggleCheckbox = useCallback(
    (answerIndex: number) => {
      if (locked || quizComplete || !currentQuestion) {
        return;
      }
      setCheckedAnswers((prev) => {
        const next = prev.map((entry) => [...entry]);
        if (!next[questionCounter]) {
          return prev;
        }
        next[questionCounter][answerIndex] =
          !next[questionCounter][answerIndex];
        return next;
      });
    },
    [locked, quizComplete, currentQuestion, questionCounter]
  );

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || locked || quizComplete) {
      return;
    }
    if (!hasSelections) {
      showAlert({
        title: "Antwort auswählen",
        message: "Bitte wählt mindestens eine Antwort aus, bevor ihr abgebt.",
      });
      return;
    }

    const selections = currentAnswers;
    const evaluation = currentQuestion.answers.map((answer, index) => {
      const selected = !!selections[index];
      const correct = !!answer.correct;
      let status: AnswerFeedback = "neutral";
      if (correct && selected) {
        status = "correct";
      } else if (!correct && selected) {
        status = "incorrect";
      } else if (correct && !selected) {
        status = "missed";
      }
      return { selected, correct, status };
    });

    setLocked(true);
    setFeedbackByQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: evaluation.map((entry) => entry.status),
    }));

    const questionCorrect = evaluation.every(
      (entry) => entry.status !== "incorrect" && entry.status !== "missed"
    );
    const projectedCorrectCount = questionCorrect
      ? correctCounter + 1
      : correctCounter;
    const isLastQuestion = questionCounter + 1 >= totalQuestions;

    if (questionCorrect) {
      setCorrectCounter((prev) => prev + 1);
    }

    if (!isLastQuestion) {
      setResultNotice({
        status: questionCorrect ? "correct" : "incorrect",
        message: questionCorrect ? "Richtig! Weiter so." : "Nicht ganz! ",
      });
    }

    if (isLastQuestion) {
      const finalCorrect = projectedCorrectCount;
      const finalIncorrect = Math.max(totalQuestions - finalCorrect, 0);
      const incorrectRatio =
        totalQuestions > 0 ? finalIncorrect / totalQuestions : 0;
      let penaltySeconds = 0;
      if (incorrectRatio > 0.75) {
        penaltySeconds = PENALTY_SECONDS_MAJOR;
      } else if (incorrectRatio > 0.5) {
        penaltySeconds = PENALTY_SECONDS_MINOR;
      }

      if (penaltySeconds > 0 && groupId) {
        try {
          await gameApi.addTimePenalty(groupId, {
            seconds: penaltySeconds,
            reason: `Quiz abgeschlossen mit ${Math.round(
              incorrectRatio * 100
            )}% falschen Antworten`,
            source: "quiz",
          });
        } catch (penaltyError) {
          console.warn("time penalty request failed", penaltyError);
        }
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setQuizComplete(true);
      setFinalSummary({
        correct: finalCorrect,
        total: totalQuestions,
        penaltySeconds,
      });
      setResultNotice(null);
      setLocked(false);
      return;
    }

    const delay = questionCorrect ? ADVANCE_DELAY_SUCCESS : ADVANCE_DELAY_ERROR;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setResultNotice(null);
      setLocked(false);
      setQuestionCounter((prev) => Math.min(prev + 1, totalQuestions - 1));
    }, delay);
  }, [
    currentQuestion,
    locked,
    quizComplete,
    hasSelections,
    currentAnswers,
    questionCounter,
    totalQuestions,
    correctCounter,
    groupId,
  ]);

  const renderAnswerStatusIcon = useCallback(
    (status: AnswerFeedback) => {
      switch (status) {
        case "correct":
          return (
            <IconSymbol
              name="checkmark.circle"
              size={20}
              color={theme.success}
            />
          );
        case "incorrect":
          return (
            <IconSymbol name="xmark.circle" size={20} color={theme.danger} />
          );
        case "missed":
          return (
            <IconSymbol
              name="questionmark.circle"
              size={20}
              color={theme.warning ?? "#f97316"}
            />
          );
        default:
          return null;
      }
    },
    [theme.danger, theme.success, theme.warning]
  );

  return (
    <ThemedView style={styles.screen}>
      <PopupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="🎉 Finale Challenge!"
        content="Ihr müsst eine Reihe von Fragen per Multiple Choice richtig
            beantworten um an den Schlüssel fürs Finale zu kommen"
      />
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
        <ThemedView
          style={[
            styles.card,
            styles.heroCard,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
          testID="quiz-hero-card"
        >
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>
              Quiz Challenge
            </ThemedText>
            <HelloWave />
          </View>
          <ThemedText style={[styles.leadText, { color: theme.textSecondary }]}>
            Beantwortet jede Frage gemeinsam. Für falsche Antworten kassiert ihr
            Zeitstrafen – also wählt mit Bedacht!
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: theme.backgroundAlt,
                borderColor: theme.border,
              },
            ]}
          >
            <IconSymbol name="timer" size={18} color={theme.primary} />
            <ThemedText
              style={[styles.statusBadgeLabel, { color: theme.textMuted }]}
            >
              Frage {Math.min(questionCounter + 1, Math.max(totalQuestions, 1))}{" "}
              von {Math.max(totalQuestions, 1)} · Richtig: {correctCounter}
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText
                style={[styles.loadingText, { color: theme.textMuted }]}
              >
                Quiz wird geladen …
              </ThemedText>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <IconSymbol
                name="exclamationmark.triangle"
                size={24}
                color={theme.danger}
              />
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                {error}
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
                activeOpacity={0.9}
                onPress={loadQuestions}
              >
                <IconSymbol
                  name="arrow.clockwise"
                  size={18}
                  color={theme.primary}
                />
                <ThemedText
                  style={[styles.retryText, { color: theme.primary }]}
                >
                  Erneut versuchen
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : currentQuestion ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionHeading}>
                {currentQuestion.question}
              </ThemedText>
              {currentQuestion.imageUrl ? (
                <Image
                  source={{ uri: currentQuestion.imageUrl }}
                  style={styles.questionImage}
                  contentFit="cover"
                />
              ) : null}
              <View style={styles.answerList}>
                {currentQuestion.answers.map((answer, index) => {
                  const selected = currentAnswers[index] ?? false;
                  const status = answerStatuses[index] ?? "neutral";
                  const statusIcon = renderAnswerStatusIcon(status);
                  return (
                    <TouchableOpacity
                      key={answer.id}
                      style={[
                        styles.answerOption,
                        status !== "neutral" && styles.answerOptionEvaluated,
                        getAnswerStyle(status, selected, theme),
                      ]}
                      activeOpacity={0.9}
                      onPress={() => toggleCheckbox(index)}
                      disabled={locked}
                    >
                      <View style={styles.answerLeft}>
                        <Checkbox
                          value={selected}
                          onValueChange={() => toggleCheckbox(index)}
                          disabled={locked}
                          color={selected ? theme.primary : undefined}
                        />
                        <ThemedText
                          style={[
                            styles.answerText,
                            status === "correct" && { color: theme.success },
                            status === "incorrect" && { color: theme.danger },
                            status === "missed" && {
                              color: theme.warning ?? "#f97316",
                            },
                          ]}
                        >
                          {answer.text}
                        </ThemedText>
                      </View>
                      <View style={styles.answerRight}>
                        {answer.imageUrl ? (
                          <Image
                            source={{ uri: answer.imageUrl }}
                            style={styles.answerImage}
                            contentFit="cover"
                          />
                        ) : null}
                        {statusIcon}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!quizComplete ? (
                <Button onPress={handleSubmit} iconText="arrow.right.circle">
                  {locked ? "Bitte warten …" : "Antwort abgeben"}
                </Button>
              ) : null}
              {quizComplete && finalSummary ? (
                <View
                  style={[
                    styles.completionCard,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundAlt,
                    },
                  ]}
                >
                  <View style={styles.completionHeader}>
                    <IconSymbol
                      name="checkmark.circle"
                      size={24}
                      color={theme.success}
                    />
                    <ThemedText
                      style={[styles.completionTitle, { color: theme.success }]}
                    >
                      Quiz abgeschlossen
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.completionText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Richtige Antworten: {finalSummary.correct}/
                    {finalSummary.total}
                  </ThemedText>
                  {summaryStats ? (
                    <ThemedText
                      style={[
                        styles.completionText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Falsche Antworten: {summaryStats.incorrect} (
                      {summaryStats.incorrectPercent}%)
                    </ThemedText>
                  ) : null}
                  {finalSummary.penaltySeconds > 0 ? (
                    <ThemedText
                      style={[styles.completionText, { color: theme.danger }]}
                    >
                      Zeitstrafe: {finalSummary.penaltySeconds} Sekunden –
                      {finalSummary.penaltySeconds === PENALTY_SECONDS_MAJOR
                        ? " das tut weh, aber ihr könnt noch aufholen!"
                        : " ihr könnt das nächste Spiel noch schneller meistern!"}
                    </ThemedText>
                  ) : (
                    <ThemedText
                      style={[
                        styles.completionText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Keine Zeitstrafe – starke Teamarbeit!
                    </ThemedText>
                  )}
                  <Button
                    onPress={() => router.navigate("/game/questionary")}
                    iconText="arrow.right.circle"
                  >
                    Weiter
                  </Button>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                name="checkmark.seal"
                size={28}
                color={theme.primary}
              />
              <ThemedText
                style={[styles.emptyText, { color: theme.textSecondary }]}
              >
                Keine Quizfragen verfügbar. Kommt später noch einmal vorbei!
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* <HintBox>
          Tipp: Sprecht jede Antwort gemeinsam durch. Je weniger Fehler ihr macht, desto weniger Zeit gibt’s obendrauf.
        </HintBox> */}
      </ParallaxScrollView>

      {resultNotice ? (
        <View pointerEvents="none" style={styles.resultNoticeContainer}>
          <View
            style={[
              styles.resultNotice,
              resultNotice.status === "correct"
                ? {
                    borderColor: theme.success,
                    backgroundColor: "rgba(34,197,94,0.16)",
                  }
                : {
                    borderColor: theme.danger,
                    backgroundColor: "rgba(239,68,68,0.16)",
                  },
            ]}
          >
            <IconSymbol
              name={
                resultNotice.status === "correct"
                  ? "checkmark.circle"
                  : "xmark.circle"
              }
              size={20}
              color={
                resultNotice.status === "correct" ? theme.success : theme.danger
              }
            />
            <ThemedText
              style={[
                styles.resultNoticeText,
                {
                  color:
                    resultNotice.status === "correct"
                      ? theme.success
                      : theme.danger,
                },
              ]}
            >
              {resultNotice.message}
            </ThemedText>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAnswerStyle(
  status: AnswerFeedback,
  selected: boolean,
  theme: Theme
) {
  const base = {
    borderColor: theme.border,
    backgroundColor: theme.backgroundAlt,
  } as const;

  if (status === "correct") {
    return {
      borderColor: theme.success,
      backgroundColor: "rgba(34,197,94,0.12)",
    };
  }
  if (status === "incorrect") {
    return {
      borderColor: theme.danger,
      backgroundColor: "rgba(239,68,68,0.12)",
    };
  }
  if (status === "missed") {
    return {
      borderColor: theme.warning ?? "rgba(249,115,22,0.7)",
      backgroundColor: "rgba(249,115,22,0.12)",
    };
  }
  if (selected) {
    return {
      borderColor: theme.primary,
      backgroundColor: "rgba(59,130,246,0.12)",
    };
  }
  return base;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 16,
    marginHorizontal: 0,
    marginBottom: 0,
    width: "100%",
    alignSelf: "center",
    maxWidth: 720,
  },
  heroCard: {
    gap: 18,
    marginTop: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleText: {
    flex: 1,
  },
  leadText: {
    fontSize: 16,
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "600",
  },
  answerList: {
    gap: 14,
    marginBottom: 8,
  },
  answerOption: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  answerOptionEvaluated: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  answerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  answerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  questionImage: {
    width: "100%",
    height: 160,
    borderRadius: 18,
  },
  answerImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 16,
  },
  errorState: {
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  resultNoticeContainer: {
    position: "absolute",
    bottom: 28,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  resultNotice: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 680,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  resultNoticeText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  completionCard: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  completionText: {
    fontSize: 15,
    lineHeight: 22,
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
});
