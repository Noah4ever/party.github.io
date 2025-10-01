import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/theme";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, QuizAnswerOptionDTO, QuizPackDTO, QuizQuestionDTO, quizApi } from "@/lib/api";
import { confirm, showAlert, showError } from "@/lib/dialogs";

interface QuestionDraft {
  questionId?: string;
  question: string;
  difficulty?: number;
  imageUrl?: string;
  answers: QuizAnswerOptionDTO[];
}

const createAnswer = (text = "", correct = false): QuizAnswerOptionDTO => ({
  id: Math.random().toString(36).slice(2, 10),
  text,
  correct,
});

export default function QuizQuestionsScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();

  const [pack, setPack] = useState<QuizPackDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);

  const loadPack = useCallback(async () => {
    setError(null);
    try {
      const ok = await ensureSession();
      if (!ok) {
        setLoading(false);
        setRefreshing(false);
        setWorkingId(null);
        return;
      }
      const packs = (await quizApi.list()) as QuizPackDTO[];
      let primary = packs[0];
      if (!primary) {
        primary = (await quizApi.createPack({ title: "Standard Quiz" })) as QuizPackDTO;
      }
      setPack(primary);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load quiz data";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setWorkingId(null);
    }
  }, [ensureSession]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadPack();
    }, [loadPack])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPack();
  }, [loadPack]);

  const openQuestionDraft = useCallback(
    (question?: QuizQuestionDTO) => {
      if (!pack) return;
      if (question) {
        setDraft({
          questionId: question.id,
          question: question.question,
          difficulty: question.difficulty,
          imageUrl: question.imageUrl,
          answers: question.answers.map((answer) => ({ ...answer })),
        });
      } else {
        setDraft({
          question: "",
          answers: [createAnswer("", true), createAnswer()],
        });
      }
    },
    [pack]
  );

  const closeDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const addAnswer = useCallback(() => {
    if (!draft) return;
    setDraft({ ...draft, answers: [...draft.answers, createAnswer()] });
  }, [draft]);

  const updateAnswer = useCallback(
    (id: string, updates: Partial<QuizAnswerOptionDTO>) => {
      if (!draft) return;
      setDraft({
        ...draft,
        answers: draft.answers.map((answer) => (answer.id === id ? { ...answer, ...updates } : answer)),
      });
    },
    [draft]
  );

  const removeAnswer = useCallback(
    (id: string) => {
      if (!draft) return;
      setDraft({
        ...draft,
        answers: draft.answers.filter((answer) => answer.id !== id),
      });
    },
    [draft]
  );

  const ensureValidDraft = useCallback(() => {
    if (!draft) return false;
    if (!draft.question.trim()) {
      showAlert({ title: "Missing question", message: "Please enter a question." });
      return false;
    }
    const answers = draft.answers.filter((answer) => answer.text.trim());
    if (answers.length < 2) {
      showAlert({ title: "Not enough answers", message: "At least two answers are required." });
      return false;
    }
    if (!answers.some((answer) => answer.correct)) {
      showAlert({ title: "No correct answer", message: "Please mark at least one answer as correct." });
      return false;
    }
    return true;
  }, [draft]);

  const saveDraft = useCallback(async () => {
    if (!draft || !pack || !ensureValidDraft()) return;
    setWorkingId(draft.questionId ?? "__create-question");
    const payload: Omit<QuizQuestionDTO, "id"> & { id?: string } = {
      question: draft.question.trim(),
      difficulty: draft.difficulty,
      imageUrl: draft.imageUrl?.trim() || undefined,
      answers: draft.answers
        .filter((answer) => answer.text.trim())
        .map((answer) => ({ ...answer, text: answer.text.trim() })),
    };
    try {
      const ok = await ensureSession();
      if (!ok) {
        setWorkingId(null);
        return;
      }
      if (draft.questionId) {
        await quizApi.updateQuestion(pack.id, draft.questionId, payload);
      } else {
        await quizApi.addQuestion(pack.id, payload);
      }
      closeDraft();
      await loadPack();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save question";
      showError(message);
    }
  }, [closeDraft, draft, ensureSession, ensureValidDraft, loadPack, pack]);

  const deleteQuestion = useCallback(
    async (question: QuizQuestionDTO) => {
      if (!pack) return;
      const confirmed = await confirm({
        title: "Delete question",
        message: "Delete this question?",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
      setWorkingId(question.id);
      try {
        const ok = await ensureSession();
        if (!ok) {
          setWorkingId(null);
          return;
        }
        await quizApi.deleteQuestion(pack.id, question.id);
        await loadPack();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to delete question";
        showError(message);
      }
    },
    [ensureSession, loadPack, pack]
  );

  const questionItems = useMemo(() => {
    if (!pack) return null;
    if (pack.questions.length === 0) {
      return <ThemedText style={{ color: theme.textMuted }}>No questions yet.</ThemedText>;
    }
    return pack.questions.map((question) => (
      <ThemedView
        key={question.id}
        style={[styles.questionCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <ThemedText>{question.question}</ThemedText>
        {question.difficulty !== undefined ? (
          <ThemedText style={{ color: theme.textMuted }}>Difficulty: {question.difficulty}</ThemedText>
        ) : null}
        <View style={{ gap: 4 }}>
          {question.answers.map((answer) => (
            <ThemedText key={answer.id} style={{ color: answer.correct ? theme.success : theme.text }}>
              {answer.correct ? "✓ " : "• "}
              {answer.text}
            </ThemedText>
          ))}
        </View>
        <View style={styles.rowButtons}>
          <SecondaryButton label="Edit" onPress={() => openQuestionDraft(question)} />
          <SecondaryButton label="Delete" destructive onPress={() => deleteQuestion(question)} />
        </View>
      </ThemedView>
    ));
  }, [
    deleteQuestion,
    openQuestionDraft,
    pack,
    theme.background,
    theme.border,
    theme.success,
    theme.text,
    theme.textMuted,
  ]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Quiz Questions" }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
          />
        }>
        {pack ? (
          <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.cardHeaderSimple}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="subtitle">{pack.title}</ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 13 }}>
                  Manage questions and answers for this quiz.
                </ThemedText>
              </View>
              <PrimaryButton label="New question" onPress={() => openQuestionDraft()} />
            </View>
            <View style={{ gap: 12 }}>{questionItems}</View>
          </ThemedView>
        ) : null}

        {draft ? (
          <QuestionEditor
            draft={draft}
            setDraft={setDraft}
            addAnswer={addAnswer}
            updateAnswer={updateAnswer}
            removeAnswer={removeAnswer}
            onSave={saveDraft}
            onCancel={closeDraft}
            working={workingId === draft.questionId || workingId === "__create-question"}
          />
        ) : null}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function QuestionEditor({
  draft,
  setDraft,
  addAnswer,
  updateAnswer,
  removeAnswer,
  onSave,
  onCancel,
  working,
}: {
  draft: QuestionDraft;
  setDraft: (draft: QuestionDraft) => void;
  addAnswer: () => void;
  updateAnswer: (id: string, updates: Partial<QuizAnswerOptionDTO>) => void;
  removeAnswer: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  working: boolean;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.editor, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <ThemedText type="subtitle">{draft.questionId ? "Edit question" : "New question"}</ThemedText>
      <TextInput
        value={draft.question}
        onChangeText={(text) => setDraft({ ...draft, question: text })}
        placeholder="Question text"
        placeholderTextColor={theme.placeholder}
        multiline
        style={[
          styles.input,
          {
            color: theme.inputText,
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
          },
        ]}
      />
      <TextInput
        value={draft.difficulty !== undefined ? String(draft.difficulty) : ""}
        onChangeText={(value) =>
          setDraft({
            ...draft,
            difficulty: value.trim() ? Number(value) || undefined : undefined,
          })
        }
        placeholder="Difficulty (optional)"
        keyboardType="numeric"
        placeholderTextColor={theme.placeholder}
        style={[
          styles.input,
          {
            color: theme.inputText,
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
          },
        ]}
      />
      <TextInput
        value={draft.imageUrl ?? ""}
        onChangeText={(text) => setDraft({ ...draft, imageUrl: text.trim() || undefined })}
        placeholder="Image URL (optional)"
        placeholderTextColor={theme.placeholder}
        style={[
          styles.input,
          {
            color: theme.inputText,
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
          },
        ]}
      />
      <View style={{ gap: 12 }}>
        {draft.answers.map((answer) => (
          <View
            key={answer.id}
            style={[styles.answerRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <TouchableOpacity
              onPress={() => updateAnswer(answer.id, { correct: !answer.correct })}
              style={[
                styles.correctToggle,
                {
                  backgroundColor: answer.correct ? theme.success : theme.surface,
                  borderColor: theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={answer.correct ? "Mark as incorrect" : "Mark as correct"}>
              <IconSymbol
                name={answer.correct ? "checkmark.circle" : "circle"}
                size={20}
                color={answer.correct ? theme.background : theme.text}
              />
            </TouchableOpacity>
            <TextInput
              value={answer.text}
              onChangeText={(text) => updateAnswer(answer.id, { text })}
              placeholder="Answer"
              placeholderTextColor={theme.placeholder}
              style={[
                styles.input,
                styles.flex,
                {
                  color: theme.inputText,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                },
              ]}
            />
            <TouchableOpacity
              onPress={() => removeAnswer(answer.id)}
              accessibilityRole="button"
              accessibilityLabel="Remove answer">
              <IconSymbol name="trash.fill" size={20} color={theme.danger} />
            </TouchableOpacity>
          </View>
        ))}
        <SecondaryButton label="Add answer" onPress={addAnswer} />
      </View>
      <View style={styles.rowButtons}>
        <PrimaryButton label={working ? "Saving..." : "Save"} onPress={onSave} disabled={working} loading={working} />
        <SecondaryButton label="Cancel" onPress={onCancel} />
      </View>
    </ThemedView>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: theme.accent,
          opacity: disabled || loading ? 0.6 : 1,
        },
      ]}>
      <ThemedText style={{ color: theme.background, fontWeight: "600" }}>
        {loading ? "Please wait..." : label}
      </ThemedText>
    </TouchableOpacity>
  );
}

function SecondaryButton({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={false}
      style={[
        styles.button,
        {
          backgroundColor: destructive ? theme.danger : theme.surface,
          opacity: destructive ? 0.9 : 1,
        },
      ]}>
      <ThemedText style={{ color: destructive ? theme.background : theme.text }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 16,
  },
  cardHeaderSimple: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  questionCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 12,
  },
  rowButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  editor: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  correctToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loader: {
    marginTop: 24,
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
});
