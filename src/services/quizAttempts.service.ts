import {
  collection,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "./firebase.config";
import type { QuizAttemptInput } from "../types/quiz.types";

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
  return new Date().toISOString().split("T")[0];
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

export async function saveQuizAttempt(input: QuizAttemptInput): Promise<string> {
  const attemptRef = doc(collection(db, "users", input.userId, "quizAttempts"));
  const statsRef = doc(db, "users", input.userId, "stats", "main");
  const performanceRef = doc(db, "users", input.userId, "stats", "performance");
  const activityRef = doc(db, "users", input.userId, "activityLogs", getDateKey());
  const monthInfo = getMonthInfo();
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
    monthlyRef.path,
    ...(documentStatsRef ? [documentStatsRef.path] : []),
    ...(documentRef ? [documentRef.path] : []),
    ...wrongAnswerRefs.map((ref) => ref.path),
  ];

  try {
    await runTransaction(db, async (transaction) => {
      const statsSnap = await transaction.get(statsRef);
      const performanceSnap = await transaction.get(performanceRef);
      const activitySnap = await transaction.get(activityRef);
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
        sourceType: input.sourceType,
        title: input.title,
        totalQuestions: input.result.totalQuestions,
        correctCount: input.result.correctCount,
        wrongCount: input.result.wrongCount,
        blankCount: input.result.blankCount,
        successRate: input.result.successRate,
        answers: input.result.answers,
        createdAt: serverTimestamp(),
      }
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
        documentId: input.documentId,
        documentName: input.documentTitle ?? "Genel test",
        category: input.sourceType === "document" ? "Doküman Testi" : "Genel Test",
        question: answer.question,
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
