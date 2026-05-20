export type AiChatMode = "lesson" | "test";

export type QuizSourceType = "document" | "general";

export type QuizDifficulty = "easy" | "medium" | "hard";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  difficulty: QuizDifficulty;
  documentReference?: string;
}

export interface QuizPayload {
  mode: "test";
  title: string;
  sourceType: QuizSourceType;
  documentId: string | null;
  questions: QuizQuestion[];
}

export interface QuizContextInfo {
  prompt: string;
  documentId: string | null;
  documentTitle: string | null;
  documentType: string | null;
  questionCount: number;
  assistantMessage: string;
  createdAt: Date;
}

export interface QuizAnswerRecord {
  questionId: string;
  question: string;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  correctOptionId: string;
  correctOptionText: string;
  isCorrect: boolean;
  isBlank: boolean;
  explanation: string;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  successRate: number;
  answers: QuizAnswerRecord[];
}

export interface QuizAttemptInput {
  userId: string;
  documentId: string | null;
  documentTitle: string | null;
  sourceType: QuizSourceType;
  title: string;
  result: QuizResult;
}

export type QuizSaveStatus = "idle" | "saving" | "saved" | "error";
