import type {
  QuizAnswerRecord,
  QuizQuestion,
  QuizResult,
} from "../../types/quiz.types";

export type QuizSelectionMap = Record<string, string | null>;

function findOptionText(question: QuizQuestion, optionId: string | null): string | null {
  if (!optionId) return null;
  return question.options.find((option) => option.id === optionId)?.text ?? optionId;
}

export function calculateQuizResult(
  questions: QuizQuestion[],
  selections: QuizSelectionMap
): QuizResult {
  const answers: QuizAnswerRecord[] = questions.map((question) => {
    const selectedOptionId = selections[question.id] ?? null;
    const isBlank = selectedOptionId === null;
    const isCorrect = !isBlank && selectedOptionId === question.correctOptionId;

    return {
      questionId: question.id,
      question: question.question,
      selectedOptionId,
      selectedOptionText: findOptionText(question, selectedOptionId),
      correctOptionId: question.correctOptionId,
      correctOptionText: findOptionText(question, question.correctOptionId) ?? question.correctOptionId,
      isCorrect,
      isBlank,
      explanation: question.explanation,
    };
  });

  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const blankCount = answers.filter((answer) => answer.isBlank).length;
  const wrongCount = answers.length - correctCount - blankCount;
  const successRate =
    answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  return {
    totalQuestions: answers.length,
    correctCount,
    wrongCount,
    blankCount,
    successRate,
    answers,
  };
}
