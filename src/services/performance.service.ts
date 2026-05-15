import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from "firebase/firestore";
import { app } from "./firebase.config";

const db = getFirestore(app);

export interface PerformanceSummary {
  total: number | null;
  correct: number | null;
  wrong: number | null;
  blank: number | null;
}

export interface MonthlyPerformancePoint {
  id: string;
  month: string;
  value: number;
  monthIndex: number;
}

export interface PdfPerformanceRow {
  id: string;
  documentName: string;
  questionCount: number;
  correctCount: number;
  successRate: number;
}

export interface PerformanceData {
  summary: PerformanceSummary;
  monthlyTrend: MonthlyPerformancePoint[];
  documents: PdfPerformanceRow[];
}

const EMPTY_SUMMARY: PerformanceSummary = {
  total: null,
  correct: null,
  wrong: null,
  blank: null,
};

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
];

function readNumber(data: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function fetchPerformanceSummary(uid: string): Promise<PerformanceSummary> {
  const performanceDoc = await getDoc(doc(db, "users", uid, "stats", "performance"));
  const mainStatsDoc = await getDoc(doc(db, "users", uid, "stats", "main"));
  const performanceData = performanceDoc.exists() ? performanceDoc.data() : {};
  const mainStatsData = mainStatsDoc.exists() ? mainStatsDoc.data() : {};
  const merged = { ...mainStatsData, ...performanceData };

  const correct = readNumber(merged, ["correct", "correctAnswers", "totalCorrectAnswers"]);
  const wrong = readNumber(merged, ["wrong", "wrongAnswers", "totalWrongAnswers"]);
  const blank = readNumber(merged, ["blank", "blankAnswers", "totalBlankAnswers"]);
  const explicitTotal = readNumber(merged, [
    "total",
    "totalQuestions",
    "totalAnsweredQuestions",
    "totalQuestionsSolved",
  ]);
  const calculatedTotal =
    correct !== null || wrong !== null || blank !== null
      ? (correct ?? 0) + (wrong ?? 0) + (blank ?? 0)
      : null;

  return {
    total: explicitTotal ?? calculatedTotal,
    correct,
    wrong,
    blank,
  };
}

async function fetchMonthlyPerformanceTrend(
  uid: string
): Promise<MonthlyPerformancePoint[]> {
  const colRef = collection(db, "users", uid, "performanceMonthly");
  const snap = await getDocs(colRef);

  return snap.docs
    .map((item) => {
      const data = item.data();
      const monthIndex =
        readNumber(data, ["monthIndex", "month"]) ?? Number.parseInt(item.id, 10);
      const value = readNumber(data, ["value", "successRate", "rate"]);

      if (value === null || !Number.isFinite(monthIndex)) return null;

      return {
        id: item.id,
        month:
          typeof data.monthLabel === "string"
            ? data.monthLabel
            : MONTH_LABELS[Math.max(0, Math.min(11, monthIndex - 1))] ?? item.id,
        value: clampPercent(value),
        monthIndex,
      };
    })
    .filter((item): item is MonthlyPerformancePoint => item !== null)
    .sort((a, b) => a.monthIndex - b.monthIndex);
}

async function fetchPdfPerformance(uid: string): Promise<PdfPerformanceRow[]> {
  const colRef = collection(db, "users", uid, "documents");
  const snap = await getDocs(query(colRef, orderBy("createdAt", "desc")));

  return snap.docs
    .map((item) => {
      const data = item.data();
      const questionCount =
        readNumber(data, ["questionCount", "answeredQuestions", "totalQuestions"]) ?? 0;
      const correctCount = readNumber(data, ["correctCount", "correctAnswers"]) ?? 0;
      const explicitSuccessRate = readNumber(data, ["successRate", "rate"]);
      const successRate =
        explicitSuccessRate ?? (questionCount > 0 ? (correctCount / questionCount) * 100 : 0);

      if (questionCount <= 0) return null;

      return {
        id: item.id,
        documentName:
          typeof data.name === "string" ? data.name : "Bilinmeyen Doküman",
        questionCount,
        correctCount,
        successRate: clampPercent(successRate),
      };
    })
    .filter((item): item is PdfPerformanceRow => item !== null);
}

export async function fetchPerformanceData(uid: string): Promise<PerformanceData> {
  const [summary, monthlyTrend, documents] = await Promise.all([
    fetchPerformanceSummary(uid),
    fetchMonthlyPerformanceTrend(uid),
    fetchPdfPerformance(uid),
  ]);

  return {
    summary: summary ?? EMPTY_SUMMARY,
    monthlyTrend,
    documents,
  };
}

export function getEmptyPerformanceData(): PerformanceData {
  return {
    summary: EMPTY_SUMMARY,
    monthlyTrend: [],
    documents: [],
  };
}
