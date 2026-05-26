import {
  collection,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "./firebase.config";
import type {
  QuizAttemptInput,
  QuizPayload,
  QuizQuestion,
  QuizResult,
} from "../types/quiz.types";

const db = getFirestore(app);

const MONTH_LABELS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

function readNumber(data: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return 0;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDateKey(): string {
  return getLocalDateKey();
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTurkishDayLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date);
}

function getMonthInfo() {
  const date = new Date();
  const monthIndex = date.getMonth() + 1;
  const id = `${date.getFullYear()}-${String(monthIndex).padStart(2, "0")}`;

  return {
    id,
    monthIndex,
    monthLabel: MONTH_LABELS[monthIndex - 1],
  };
}

function nextRate(correct: number, total: number): number {
  return total > 0 ? clampPercent((correct / total) * 100) : 0;
}

function logQuizSaveFailure(paths: string[], error: unknown): void {
  paths.forEach((path) => {
    console.error("[Quiz Save] Failed path:", path, error);
  });
}

function assertCurrentUser(uid: string): void {
  const authUid = getAuth(app).currentUser?.uid ?? null;
  if (!authUid) {
    throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
  }
  if (authUid !== uid) {
    throw new Error("Auth UID ile kayıt UID eşleşmiyor.");
  }
}

function findOptionText(question: QuizQuestion, optionId: string | null): string | null {
  if (!optionId) return null;
  return question.options.find((option) => option.id === optionId)?.text ?? optionId;
}

function buildAttemptQuestions(quiz: QuizPayload) {
  return quiz.questions.map((question, index) => ({
    id: question.id,
    order: index,
    question: question.question,
    options: question.options,
    correctOptionId: question.correctOptionId,
    correctAnswer: question.correctOptionId,
    correctAnswerText: findOptionText(question, question.correctOptionId),
    selectedOptionId: null,
    selectedAnswer: null,
    selectedAnswerText: null,
    status: "unanswered",
    isCorrect: null,
    answeredAt: null,
    explanation: question.explanation,
    difficulty: question.difficulty,
    documentReference: question.documentReference ?? null,
  }));
}

function buildCompletedQuestions(
  existingQuestions: unknown,
  quiz: QuizPayload | undefined,
  result: QuizResult
) {
  const sourceQuestions = Array.isArray(existingQuestions)
    ? existingQuestions
    : quiz
      ? buildAttemptQuestions(quiz)
      : [];
  const resultByQuestion = new Map(
    result.answers.map((answer) => [answer.questionId, answer])
  );

  return sourceQuestions.map((item) => {
    const question = item as Record<string, unknown>;
    const id = String(question.id ?? "");
    const answer = resultByQuestion.get(id);
    if (!answer) return question;

    return {
      ...question,
      selectedOptionId: answer.selectedOptionId,
      selectedAnswer: answer.selectedOptionId,
      selectedAnswerText: answer.selectedOptionText,
      status: answer.isBlank ? "blank" : "answered",
      isCorrect: answer.isBlank ? false : answer.isCorrect,
      answeredAt: question.answeredAt ?? null,
    };
  });
}

function readAttemptAnswers(questions: unknown): Record<string, string | null> {
  if (!Array.isArray(questions)) return {};

  return questions.reduce<Record<string, string | null>>((acc, item) => {
    const question = item as Record<string, unknown>;
    const id = typeof question.id === "string" ? question.id : null;
    const status = typeof question.status === "string" ? question.status : "unanswered";
    if (!id || status === "unanswered") return acc;
    const selected = question.selectedOptionId ?? question.selectedAnswer ?? null;
    acc[id] = typeof selected === "string" ? selected : null;
    return acc;
  }, {});
}

export async function createQuizAttempt(input: {
  userId: string;
  chatId: string | null;
  messageId?: string | null;
  generationId: string;
  documentId: string | null;
  documentTitle: string | null;
  sourceType: QuizAttemptInput["sourceType"];
  title: string;
  prompt: string;
  quiz: QuizPayload;
}): Promise<string> {
  assertCurrentUser(input.userId);

  const attemptRef = doc(collection(db, "users", input.userId, "quizAttempts"));
  await runTransaction(db, async (transaction) => {
    transaction.set(attemptRef, {
      id: attemptRef.id,
      userId: input.userId,
      chatId: input.chatId,
      messageId: input.messageId ?? null,
      generationId: input.generationId,
      documentId: input.documentId,
      documentTitle: input.documentTitle,
      documentName: input.documentTitle,
      sourceType: input.sourceType,
      prompt: input.prompt,
      title: input.title,
      mode: "test",
      status: "in_progress",
      totalQuestions: input.quiz.questions.length,
      correctCount: 0,
      wrongCount: 0,
      blankCount: 0,
      scorePercent: 0,
      successRate: 0,
      currentQuestionIndex: 0,
      questions: buildAttemptQuestions(input.quiz),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completedAt: null,
    });
  });

  return attemptRef.id;
}

export async function updateQuizAttemptMessageId(input: {
  userId: string;
  attemptId: string;
  messageId: string;
}): Promise<void> {
  assertCurrentUser(input.userId);
  await updateDoc(doc(db, "users", input.userId, "quizAttempts", input.attemptId), {
    messageId: input.messageId,
    updatedAt: serverTimestamp(),
  });
}

export async function saveQuizAttemptAnswer(input: {
  userId: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  currentQuestionIndex: number;
}): Promise<void> {
  assertCurrentUser(input.userId);
  const attemptRef = doc(db, "users", input.userId, "quizAttempts", input.attemptId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(attemptRef);
    if (!snap.exists()) throw new Error("Test kaydı bulunamadı.");

    const data = snap.data();
    if (data.status === "completed") return;

    const questions = Array.isArray(data.questions) ? data.questions : [];
    const updatedQuestions = questions.map((item) => {
      const question = item as Record<string, unknown>;
      if (question.id !== input.questionId || question.status === "answered") return question;

      const isCorrect = input.selectedOptionId === question.correctOptionId;
      const optionText = Array.isArray(question.options)
        ? (question.options as Array<{ id?: string; text?: string }>).find(
            (option) => option.id === input.selectedOptionId
          )?.text ?? input.selectedOptionId
        : input.selectedOptionId;

      return {
        ...question,
        selectedOptionId: input.selectedOptionId,
        selectedAnswer: input.selectedOptionId,
        selectedAnswerText: optionText,
        status: "answered",
        isCorrect,
        answeredAt: Timestamp.now(),
      };
    });

    const correctCount = updatedQuestions.filter(
      (item) => (item as Record<string, unknown>).isCorrect === true
    ).length;
    const wrongCount = updatedQuestions.filter((item) => {
      const question = item as Record<string, unknown>;
      return question.status === "answered" && question.isCorrect === false;
    }).length;
    const totalQuestions = readNumber(data, ["totalQuestions"]) || updatedQuestions.length;

    transaction.update(attemptRef, {
      questions: updatedQuestions,
      correctCount,
      wrongCount,
      blankCount: 0,
      scorePercent: nextRate(correctCount, totalQuestions),
      successRate: nextRate(correctCount, totalQuestions),
      currentQuestionIndex: input.currentQuestionIndex,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateQuizAttemptProgress(input: {
  userId: string;
  attemptId: string;
  currentQuestionIndex: number;
}): Promise<void> {
  assertCurrentUser(input.userId);
  await updateDoc(doc(db, "users", input.userId, "quizAttempts", input.attemptId), {
    currentQuestionIndex: input.currentQuestionIndex,
    updatedAt: serverTimestamp(),
  });
}

export async function getQuizAttemptProgress(
  userId: string,
  attemptId: string
): Promise<{
  answers: Record<string, string | null>;
  status: "in_progress" | "completed" | "abandoned";
  currentQuestionIndex: number;
  result: QuizResult | null;
} | null> {
  assertCurrentUser(userId);
  const snap = await getDoc(doc(db, "users", userId, "quizAttempts", attemptId));
  if (!snap.exists()) return null;

  const data = snap.data();
  const answers = readAttemptAnswers(data.questions);
  const status =
    data.status === "completed" || data.status === "abandoned"
      ? data.status
      : "in_progress";
  const result =
    status === "completed"
      ? {
          totalQuestions: readNumber(data, ["totalQuestions"]),
          correctCount: readNumber(data, ["correctCount"]),
          wrongCount: readNumber(data, ["wrongCount"]),
          blankCount: readNumber(data, ["blankCount"]),
          successRate: readNumber(data, ["scorePercent", "successRate"]),
          answers: Array.isArray(data.questions)
            ? data.questions.map((item) => {
                const question = item as Record<string, unknown>;
                const selectedOptionId =
                  typeof question.selectedOptionId === "string"
                    ? question.selectedOptionId
                    : null;
                return {
                  questionId: String(question.id ?? ""),
                  question: String(question.question ?? ""),
                  selectedOptionId,
                  selectedOptionText:
                    typeof question.selectedAnswerText === "string"
                      ? question.selectedAnswerText
                      : null,
                  correctOptionId: String(question.correctOptionId ?? question.correctAnswer ?? ""),
                  correctOptionText: String(question.correctAnswerText ?? question.correctOptionId ?? ""),
                  isCorrect: question.isCorrect === true,
                  isBlank: question.status === "blank",
                  explanation: String(question.explanation ?? ""),
                };
              })
            : [],
        }
      : null;

  return {
    answers,
    status,
    currentQuestionIndex: readNumber(data, ["currentQuestionIndex"]),
    result,
  };
}

export async function saveQuizAttempt(input: QuizAttemptInput): Promise<string> {
  const attemptRef = input.attemptId
    ? doc(db, "users", input.userId, "quizAttempts", input.attemptId)
    : doc(collection(db, "users", input.userId, "quizAttempts"));
  const statsRef = doc(db, "users", input.userId, "stats", "main");
  const performanceRef = doc(db, "users", input.userId, "stats", "performance");
  const activityRef = doc(db, "users", input.userId, "activityLogs", getDateKey());
  const monthInfo = getMonthInfo();
  const todayKey = getLocalDateKey();
  const dailyRef = doc(db, "users", input.userId, "performanceDaily", todayKey);
  const monthlyRef = doc(
    db,
    "users",
    input.userId,
    "performanceMonthly",
    monthInfo.id
  );
  const documentStatsRef = input.documentId
    ? doc(db, "users", input.userId, "documentStats", input.documentId)
    : null;
  const documentRef = input.documentId
    ? doc(db, "users", input.userId, "documents", input.documentId)
    : null;
  const wrongAnswerRefs = input.result.answers
    .filter((answer) => !answer.isBlank && !answer.isCorrect)
    .map(() => doc(collection(db, "users", input.userId, "wrongAnswers")));
  const attemptedPaths = [
    attemptRef.path,
    statsRef.path,
    performanceRef.path,
    activityRef.path,
    dailyRef.path,
    monthlyRef.path,
    ...(documentStatsRef ? [documentStatsRef.path] : []),
    ...(documentRef ? [documentRef.path] : []),
    ...wrongAnswerRefs.map((ref) => ref.path),
  ];
  const authUid = getAuth(app).currentUser?.uid ?? null;

  void ({
    authUid,
    targetUid: input.userId,
    projectId: app.options.projectId,
    paths: attemptedPaths.slice(0, 6),
  });

  if (!authUid) {
    throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
  }

  if (authUid !== input.userId) {
    throw new Error("Auth UID ile kayıt UID eşleşmiyor.");
  }

  try {
    await runTransaction(db, async (transaction) => {
      const attemptSnap = await transaction.get(attemptRef);
      if (attemptSnap.exists() && attemptSnap.data().status === "completed") return;
      const statsSnap = await transaction.get(statsRef);
      const performanceSnap = await transaction.get(performanceRef);
      const activitySnap = await transaction.get(activityRef);
      const dailySnap = await transaction.get(dailyRef);
      const monthlySnap = await transaction.get(monthlyRef);
      const documentStatsSnap = documentStatsRef
        ? await transaction.get(documentStatsRef)
        : null;
      const documentSnap = documentRef ? await transaction.get(documentRef) : null;

    const statsData = statsSnap.exists() ? statsSnap.data() : {};
    const oldAnswered = readNumber(statsData, [
      "totalQuestionsAnswered",
      "totalQuestionsSolved",
      "totalAnsweredQuestions",
    ]);
    const oldCorrect = readNumber(statsData, ["totalCorrectAnswers", "correctAnswers"]);
    const newAnswered = oldAnswered + input.result.totalQuestions;
    const newCorrect = oldCorrect + input.result.correctCount;
    const overviewRate = nextRate(newCorrect, newAnswered);

    transaction.set(
      attemptRef,
      {
        userId: input.userId,
        documentId: input.documentId,
        documentTitle: input.documentTitle,
        documentName: input.documentTitle,
        sourceType: input.sourceType,
        title: input.title,
        prompt: input.prompt ?? null,
        mode: "test",
        status: "completed",
        totalQuestions: input.result.totalQuestions,
        correctCount: input.result.correctCount,
        wrongCount: input.result.wrongCount,
        blankCount: input.result.blankCount,
        scorePercent: input.result.successRate,
        successRate: input.result.successRate,
        answers: input.result.answers,
        questions: buildCompletedQuestions(
          attemptSnap.exists() ? attemptSnap.data().questions : undefined,
          input.quiz,
          input.result
        ),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(!attemptSnap.exists() ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: true }
    );

    transaction.set(
      statsRef,
      {
        totalQuestionsAnswered: newAnswered,
        totalQuestionsSolved: newAnswered,
        totalQuestionsGenerated:
          readNumber(statsData, ["totalQuestionsGenerated"]) + input.result.totalQuestions,
        totalCorrectAnswers: newCorrect,
        totalWrongAnswers:
          readNumber(statsData, ["totalWrongAnswers", "wrongAnswers"]) +
          input.result.wrongCount,
        totalBlankAnswers:
          readNumber(statsData, ["totalBlankAnswers", "blankAnswers"]) +
          input.result.blankCount,
        averageSuccessRate: overviewRate,
        successRate: overviewRate,
        lastQuizAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const performanceData = performanceSnap.exists() ? performanceSnap.data() : {};
    const performanceTotal =
      readNumber(performanceData, ["total", "totalQuestions"]) +
      input.result.totalQuestions;
    const performanceCorrect =
      readNumber(performanceData, ["correct", "correctAnswers"]) +
      input.result.correctCount;
    const performanceWrong =
      readNumber(performanceData, ["wrong", "wrongAnswers"]) + input.result.wrongCount;
    const performanceBlank =
      readNumber(performanceData, ["blank", "blankAnswers"]) + input.result.blankCount;
    const performanceRate = nextRate(performanceCorrect, performanceTotal);

    transaction.set(
      performanceRef,
      {
        total: performanceTotal,
        totalQuestions: performanceTotal,
        correct: performanceCorrect,
        correctAnswers: performanceCorrect,
        wrong: performanceWrong,
        wrongAnswers: performanceWrong,
        blank: performanceBlank,
        blankAnswers: performanceBlank,
        successRate: performanceRate,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const monthlyData = monthlySnap.exists() ? monthlySnap.data() : {};
    const monthlyTotal =
      readNumber(monthlyData, ["totalQuestions", "total"]) + input.result.totalQuestions;
    const monthlyCorrect =
      readNumber(monthlyData, ["correctAnswers", "correct"]) + input.result.correctCount;
    const monthlyWrong =
      readNumber(monthlyData, ["wrongAnswers", "wrong"]) + input.result.wrongCount;
    const monthlyBlank =
      readNumber(monthlyData, ["blankAnswers", "blank"]) + input.result.blankCount;
    const monthlyRate = nextRate(monthlyCorrect, monthlyTotal);

    transaction.set(
      monthlyRef,
      {
        monthIndex: monthInfo.monthIndex,
        monthLabel: monthInfo.monthLabel,
        totalQuestions: monthlyTotal,
        correctAnswers: monthlyCorrect,
        wrongAnswers: monthlyWrong,
        blankAnswers: monthlyBlank,
        value: monthlyRate,
        successRate: monthlyRate,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const activityData = activitySnap.exists() ? activitySnap.data() : {};

    transaction.set(
      activityRef,
      {
        dateKey: getDateKey(),
        questionsSolved:
          readNumber(activityData, ["questionsSolved"]) + input.result.totalQuestions,
        activeCount: 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const dailyData = dailySnap.exists() ? dailySnap.data() : {};
    const dailyTotal =
      readNumber(dailyData, ["totalQuestionsAnswered", "totalQuestions", "total"]) +
      input.result.totalQuestions;
    const dailyCorrect =
      readNumber(dailyData, ["totalCorrectAnswers", "correctAnswers", "correct"]) +
      input.result.correctCount;
    const dailyWrong =
      readNumber(dailyData, ["totalWrongAnswers", "wrongAnswers", "wrong"]) +
      input.result.wrongCount;
    const dailyBlank =
      readNumber(dailyData, ["totalBlankAnswers", "blankAnswers", "blank"]) +
      input.result.blankCount;
    const dailyRate = nextRate(dailyCorrect, dailyTotal);

    transaction.set(
      dailyRef,
      {
        date: todayKey,
        dayLabel: getTurkishDayLabel(),
        totalQuestionsAnswered: dailyTotal,
        totalCorrectAnswers: dailyCorrect,
        totalWrongAnswers: dailyWrong,
        totalBlankAnswers: dailyBlank,
        successRate: dailyRate,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (documentStatsRef && input.documentId) {
      const documentStatsData = documentStatsSnap?.exists()
        ? documentStatsSnap.data()
        : {};
      const documentTotal =
        readNumber(documentStatsData, [
          "totalQuestionsAnswered",
          "answeredQuestions",
          "questionCount",
        ]) + input.result.totalQuestions;
      const documentCorrect =
        readNumber(documentStatsData, ["totalCorrectAnswers", "correctAnswers"]) +
        input.result.correctCount;
      const documentWrong =
        readNumber(documentStatsData, ["totalWrongAnswers", "wrongAnswers"]) +
        input.result.wrongCount;
      const documentBlank =
        readNumber(documentStatsData, ["totalBlankAnswers", "blankAnswers"]) +
        input.result.blankCount;
      const documentRate = nextRate(documentCorrect, documentTotal);

      transaction.set(
        documentStatsRef,
        {
          documentId: input.documentId,
          documentTitle: input.documentTitle,
          totalQuestionsAnswered: documentTotal,
          totalCorrectAnswers: documentCorrect,
          totalWrongAnswers: documentWrong,
          totalBlankAnswers: documentBlank,
          averageSuccessRate: documentRate,
          successRate: documentRate,
          lastQuizAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    if (documentRef && input.documentId) {
      const documentData = documentSnap?.exists() ? documentSnap.data() : {};
      const documentTotal =
        readNumber(documentData, ["answeredQuestions", "questionCount", "totalQuestions"]) +
        input.result.totalQuestions;
      const documentCorrect =
        readNumber(documentData, ["correctAnswers", "correctCount"]) +
        input.result.correctCount;
      const documentWrong =
        readNumber(documentData, ["wrongAnswers", "wrongCount"]) + input.result.wrongCount;
      const documentBlank =
        readNumber(documentData, ["blankAnswers", "blankCount"]) + input.result.blankCount;
      const documentRate = nextRate(documentCorrect, documentTotal);

      transaction.set(
        documentRef,
        {
          answeredQuestions: documentTotal,
          questionCount: documentTotal,
          totalQuestions: documentTotal,
          correctAnswers: documentCorrect,
          correctCount: documentCorrect,
          wrongAnswers: documentWrong,
          wrongCount: documentWrong,
          blankAnswers: documentBlank,
          blankCount: documentBlank,
          successRate: documentRate,
          lastQuizAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const wrongAnswers = input.result.answers.filter(
      (answer) => !answer.isBlank && !answer.isCorrect
    );

    wrongAnswers.forEach((answer, index) => {
      transaction.set(wrongAnswerRefs[index], {
        userId: input.userId,
        documentId: input.documentId,
        documentTitle: input.documentTitle,
        documentName: input.documentTitle ?? "Genel test",
        category: input.sourceType === "document" ? "Doküman Testi" : "Genel Test",
        question: answer.question,
        selectedOptionId: answer.selectedOptionId,
        correctOptionId: answer.correctOptionId,
        selectedAnswerText: answer.selectedOptionText,
        correctAnswerText: answer.correctOptionText,
        userAnswer: answer.selectedOptionText ?? answer.selectedOptionId ?? "-",
        correctAnswer: answer.correctOptionText,
        explanation: answer.explanation,
        createdAt: serverTimestamp(),
      });
    });
    });
  } catch (error) {
    logQuizSaveFailure(attemptedPaths, error);
    throw error;
  }

  return attemptRef.id;
}
