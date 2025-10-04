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
import { ApiError, FunnyAnswerDTO, FunnyQuestionDTO, funnyQuestionApi } from "@/lib/api";
import { confirm, showError } from "@/lib/dialogs";

interface QuestionState extends FunnyQuestionDTO {
  loadingAnswers?: boolean;
}

export default function FunnyQuestionsScreen() {
  const theme = useTheme();
  const { ensureSession } = useAdminAuth();
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, FunnyAnswerDTO[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const loadQuestions = useCallback(async () => {
    setError(null);
    try {
      const ok = await ensureSession();
      if (!ok) {
        setLoading(false);
        setRefreshing(false);
        setWorkingId(null);
        return;
      }
      const data = (await funnyQuestionApi.list()) as FunnyQuestionDTO[];
      setQuestions(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load questions";
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
      void loadQuestions();
    }, [loadQuestions])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadQuestions();
  }, [loadQuestions]);

  const handleCreate = useCallback(async () => {
    const question = newQuestion.trim();
    if (!question) return;
    setWorkingId("__create-question");
    try {
      const ok = await ensureSession();
      if (!ok) {
        setWorkingId(null);
        return;
      }
      await funnyQuestionApi.create(question);
      setNewQuestion("");
      await loadQuestions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create question";
      showError(message);
    }
  }, [ensureSession, loadQuestions, newQuestion]);

  const openEditor = useCallback((item: FunnyQuestionDTO) => {
    setEditingId(item.id);
    setEditingText(item.question);
  }, []);

  const cancelEditor = useCallback(() => {
    setEditingId(null);
    setEditingText("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    setWorkingId(editingId);
    try {
      const ok = await ensureSession();
      if (!ok) {
        setWorkingId(null);
        return;
      }
      await funnyQuestionApi.update(editingId, trimmed);
      cancelEditor();
      await loadQuestions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save question";
      showError(message);
    }
  }, [cancelEditor, editingId, editingText, ensureSession, loadQuestions]);

  const handleDelete = useCallback(
    async (item: FunnyQuestionDTO) => {
      const confirmed = await confirm({
        title: "Delete question",
        message: `Delete "${item.question}"?`,
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
      setWorkingId(item.id);
      try {
        const ok = await ensureSession();
        if (!ok) {
          setWorkingId(null);
          return;
        }
        await funnyQuestionApi.remove(item.id);
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        await loadQuestions();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to delete question";
        showError(message);
      }
    },
    [ensureSession, loadQuestions]
  );

  const toggleAnswers = useCallback(
    async (question: FunnyQuestionDTO) => {
      if (expandedId === question.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(question.id);
      if (answers[question.id]) return;
      setQuestions((prev) => prev.map((item) => (item.id === question.id ? { ...item, loadingAnswers: true } : item)));
      try {
        const ok = await ensureSession();
        if (!ok) {
          setQuestions((prev) =>
            prev.map((item) => (item.id === question.id ? { ...item, loadingAnswers: false } : item))
          );
          return;
        }
        const response = (await funnyQuestionApi.getWithAnswers(question.id)) as {
          question: FunnyQuestionDTO;
          answers: FunnyAnswerDTO[];
        };
        setAnswers((prev) => ({ ...prev, [question.id]: response.answers }));
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to load answers";
        showError(message);
      } finally {
        setQuestions((prev) =>
          prev.map((item) => (item.id === question.id ? { ...item, loadingAnswers: false } : item))
        );
      }
    },
    [answers, ensureSession, expandedId]
  );

  const handleDeleteAnswer = useCallback(
    async (questionId: string, answer: FunnyAnswerDTO) => {
      const confirmed = await confirm({
        title: "Delete answer",
        message: "Delete this answer?",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
      setWorkingId(answer.id);
      try {
        const ok = await ensureSession();
        if (!ok) {
          setWorkingId(null);
          return;
        }
        await funnyQuestionApi.removeAnswer(questionId, answer.id);
        setAnswers((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] || []).filter((item) => item.id !== answer.id),
        }));
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to delete answer";
        showError(message);
      } finally {
        setWorkingId(null);
      }
    },
    [ensureSession]
  );

  const renderCards = useMemo(
    () =>
      questions.map((question) => {
        const busy = workingId === question.id;
        const isExpanded = expandedId === question.id;
        const hasAnswers = answers[question.id];
        return (
          <ThemedView
            key={question.id}
            style={[
              styles.card,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}>
            {editingId === question.id ? (
              <View style={{ gap: 12 }}>
                <TextInput
                  value={editingText}
                  onChangeText={setEditingText}
                  placeholder="Question"
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
                <View style={styles.rowButtons}>
                  <PrimaryButton label="Save" onPress={handleSave} disabled={busy} />
                  <SecondaryButton label="Cancel" onPress={cancelEditor} />
                </View>
              </View>
            ) : (
              <>
                <ThemedText>{question.question}</ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                  Created {formatRelativeDate(question.createdAt)}
                </ThemedText>
                {question.updatedAt ? (
                  <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                    Updated {formatRelativeDate(question.updatedAt)}
                  </ThemedText>
                ) : null}
                <View style={styles.rowButtons}>
                  <SecondaryButton label="Edit" onPress={() => openEditor(question)} />
                  <SecondaryButton
                    label={isExpanded ? "Hide" : "Show answers"}
                    onPress={() => toggleAnswers(question)}
                  />
                  <SecondaryButton label="Delete" destructive onPress={() => handleDelete(question)} />
                </View>
              </>
            )}
            {isExpanded ? (
              <View style={styles.answerSection}>
                {question.loadingAnswers ? (
                  <ActivityIndicator color={theme.accent} />
                ) : hasAnswers && hasAnswers.length > 0 ? (
                  hasAnswers.map((answer) => (
                    <View
                      key={answer.id}
                      style={[
                        styles.answerCard,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}>
                      <ThemedText style={{ fontSize: 15 }}>{answer.answer}</ThemedText>
                      <View style={styles.answerMetaRow}>
                        <IconSymbol name="person.fill" size={14} color={theme.textMuted} />
                        <ThemedText style={[styles.answerMetaText, { color: theme.textMuted }]}>
                          {answer.guestName?.trim() ? answer.guestName : "Unknown guest"}
                        </ThemedText>
                        <IconSymbol name="people-outline" size={14} color={theme.textMuted} />
                        <ThemedText style={[styles.answerMetaText, { color: theme.textMuted }]}>
                          {answer.groupName?.trim() ? answer.groupName : answer.groupId || "No group"}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                        {formatRelativeDate(answer.createdAt)}
                      </ThemedText>
                      <TouchableOpacity onPress={() => handleDeleteAnswer(question.id, answer)}>
                        <IconSymbol name="trash.fill" size={18} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <ThemedText style={{ color: theme.textMuted }}>No answers yet.</ThemedText>
                )}
              </View>
            ) : null}
          </ThemedView>
        );
      }),
    [
      answers,
      cancelEditor,
      editingId,
      editingText,
      expandedId,
      handleDelete,
      handleDeleteAnswer,
      handleSave,
      openEditor,
      questions,
      theme.accent,
      theme.background,
      theme.border,
      theme.card,
      theme.danger,
      theme.inputBackground,
      theme.inputText,
      theme.placeholder,
      theme.textMuted,
      toggleAnswers,
      workingId,
    ]
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Funny Questions" }} />
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
        <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="subtitle">New question</ThemedText>
          <View style={{ gap: 12 }}>
            <TextInput
              value={newQuestion}
              onChangeText={setNewQuestion}
              placeholder="What would you like to ask?"
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
            <PrimaryButton
              label="Create"
              onPress={handleCreate}
              disabled={!newQuestion.trim()}
              loading={workingId === "__create-question"}
            />
          </View>
        </ThemedView>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : questions.length === 0 ? (
          <ThemedText style={{ color: theme.textMuted }}>No questions yet.</ThemedText>
        ) : (
          renderCards
        )}
      </ScrollView>
    </ThemedView>
  );
}

function formatRelativeDate(value: string) {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
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
      style={[
        styles.button,
        {
          backgroundColor: theme.accent,
          opacity: disabled || loading ? 0.6 : 1,
        },
      ]}
      disabled={disabled || loading}>
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
      style={[
        styles.button,
        {
          backgroundColor: destructive ? theme.danger : theme.surface,
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
    gap: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  rowButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  answerSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "transparent",
    paddingTop: 12,
    gap: 10,
  },
  answerCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  answerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  answerMetaText: {
    fontSize: 12,
  },
});
