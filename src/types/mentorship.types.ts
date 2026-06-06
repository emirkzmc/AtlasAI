export type MentorPriority = "Kritik Öncelik" | "Orta Öncelik" | "Düşük Öncelik";

export interface MentorCard {
  title: string;
  priority: MentorPriority;
  summary: string;
  recommendation: string;
  successRate: number;
}

export interface MentorInsight {
  overallMessage: string;
  strongestArea: string | null;
  weakestArea: string | null;
  totalWrongCount: number;
  overallSuccessRate: number;
}

export interface WrongAnswerSummary {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export interface QuizResultSummary {
  title: string;
  successRate: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalQuestions: number;
  createdAt: Date | null;
}

export interface TrendInfo {
  direction: "improving" | "declining" | "stable";
  recentRate: number;
  previousRate: number;
}

export interface MentorAnalysisInput {
  documentTitle: string;
  successRate: number;
  totalCorrect: number;
  totalWrong: number;
  recentWrongAnswers: WrongAnswerSummary[];
  explanations: string[];
  recentQuizResults: QuizResultSummary[];
  trendAnalysis: TrendInfo;
}

export interface MentorAnalysisResult {
  insight: MentorInsight;
  cards: MentorCard[];
}

// Firestore'da saklanacak cached verinin tipi
export interface CachedMentorAnalysis {
  result: MentorAnalysisResult;
  lastQuizDate: string; // En son quiz'in tarihi (ISO format) veya timestamp
  updatedAt: string;
}

export type MentorAnalysisStatus = "idle" | "loading" | "success" | "error";
