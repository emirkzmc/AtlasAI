import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  limit,
  Timestamp,
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

export interface DailyPerformancePoint {
  id: string;
  date: string;
  dayLabel: string;
  value: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  totalBlankAnswers: number;
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
  dailyTrend: DailyPerformancePoint[];
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

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLast7DateKeys(): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return getLocalDateKey(date);
  });
}

function getDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date);
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

async function fetchDailyPerformanceTrend(
  uid: string
): Promise<DailyPerformancePoint[]> {
  const dateKeys = getLast7DateKeys();
  const points = new Map<string, DailyPerformancePoint>();
  const datesWithDailyDoc = new Set<string>();

  dateKeys.forEach((dateKey) => {
    points.set(dateKey, {
      id: dateKey,
      date: dateKey,
      dayLabel: getDayLabel(dateKey),
      value: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      totalBlankAnswers: 0,
    });
  });

  await Promise.allSettled(
    dateKeys.map(async (dateKey) => {
      const dailyDoc = await getDoc(
        doc(db, "users", uid, "performanceDaily", dateKey)
      );
      if (!dailyDoc.exists()) return;

      const data = dailyDoc.data();
      datesWithDailyDoc.add(dateKey);
      const total = Math.max(
        0,
        readNumber(data, ["totalQuestionsAnswered", "totalQuestions", "total"]) ?? 0
      );
      const correct = Math.max(
        0,
        readNumber(data, ["totalCorrectAnswers", "correctAnswers", "correct"]) ?? 0
      );
      const wrong = Math.max(
        0,
        readNumber(data, ["totalWrongAnswers", "wrongAnswers", "wrong"]) ?? 0
      );
      const blank = Math.max(
        0,
        readNumber(data, ["totalBlankAnswers", "blankAnswers", "blank"]) ?? 0
      );

      points.set(dateKey, {
        id: dateKey,
        date: dateKey,
        dayLabel:
          typeof data.dayLabel === "string" && data.dayLabel.trim()
            ? data.dayLabel
            : getDayLabel(dateKey),
        value: total > 0 ? clampPercent((correct / total) * 100) : 0,
        totalQuestionsAnswered: total,
        totalCorrectAnswers: correct,
        totalWrongAnswers: wrong,
        totalBlankAnswers: blank,
      });
    })
  );

  const attemptsSnap = await getDocs(
    query(
      collection(db, "users", uid, "quizAttempts"),
      orderBy("createdAt", "desc"),
      limit(200)
    )
  );

  attemptsSnap.docs.forEach((attempt) => {
    const data = attempt.data();
    if (data.status && data.status !== "completed") return;
    const createdAt = data.createdAt;
    const date =
      createdAt instanceof Timestamp
        ? createdAt.toDate()
        : createdAt instanceof Date
          ? createdAt
          : null;
    if (!date) return;

    const dateKey = getLocalDateKey(date);
    const current = points.get(dateKey);
    if (!current || datesWithDailyDoc.has(dateKey)) return;

    const total = Math.max(
      0,
      readNumber(data, ["totalQuestions", "totalQuestionsAnswered", "total"]) ?? 0
    );
    const correct = Math.max(
      0,
      readNumber(data, ["correctCount", "totalCorrectAnswers", "correct"]) ?? 0
    );
    const wrong = Math.max(
      0,
      readNumber(data, ["wrongCount", "totalWrongAnswers", "wrong"]) ?? 0
    );
    const blank = Math.max(
      0,
      readNumber(data, ["blankCount", "totalBlankAnswers", "blank"]) ?? 0
    );

    current.totalQuestionsAnswered += total;
    current.totalCorrectAnswers += correct;
    current.totalWrongAnswers += wrong;
    current.totalBlankAnswers += blank;
    current.value =
      current.totalQuestionsAnswered > 0
        ? clampPercent((current.totalCorrectAnswers / current.totalQuestionsAnswered) * 100)
        : 0;
  });

  return dateKeys.map((dateKey) => points.get(dateKey)!);
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
  const [summary, monthlyTrend, dailyTrend, documents] = await Promise.all([
    fetchPerformanceSummary(uid),
    fetchMonthlyPerformanceTrend(uid),
    fetchDailyPerformanceTrend(uid),
    fetchPdfPerformance(uid),
  ]);

  return {
    summary: summary ?? EMPTY_SUMMARY,
    monthlyTrend,
    dailyTrend,
    documents,
  };
}

export function getEmptyPerformanceData(): PerformanceData {
  return {
    summary: EMPTY_SUMMARY,
    monthlyTrend: [],
    dailyTrend: [],
    documents: [],
  };
}
