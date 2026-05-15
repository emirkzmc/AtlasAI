import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { app } from "./firebase.config";
import type { IDocument } from "../components/docs/types";

const db = getFirestore(app);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDateKey(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

function getDayLabel(dateKey: string): string {
  const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cts"];
  // Use noon UTC to avoid timezone day-shift issues
  const d = new Date(`${dateKey}T12:00:00Z`);
  return dayNames[d.getUTCDay()];
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalQuestionsGenerated: number;
  totalQuestionsSolved: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDateKey: string;
}

export interface DocumentStat {
  id: string;
  name: string;
  answeredQuestions: number;
  correctAnswers: number;
  /** 0–100 */
  successRate: number;
}

export interface ActivityDay {
  dateKey: string;
  label: string;
  activeCount: number;
}

// ─── Activity & Streak ───────────────────────────────────────────────────────

/**
 * Ensures today's activity log exists and updates the streak in stats/main.
 * Idempotent: if today's log already exists, does nothing.
 */
export async function ensureTodayActivityAndStreak(uid: string): Promise<void> {
  const today = getDateKey(0);
  const activityRef = doc(db, "users", uid, "activityLogs", today);
  const activityDoc = await getDoc(activityRef);

  if (activityDoc.exists()) {
    // Already recorded today – nothing to do
    return;
  }

  // Create today's activity entry (loginCount starts at 0; incremented separately on each login)
  await setDoc(activityRef, {
    dateKey: today,
    questionsGenerated: 0,
    questionsSolved: 0,
    documentsUploaded: 0,
    activeCount: 1,
    loginCount: 0,
    updatedAt: serverTimestamp(),
  });

  // Update streak in stats/main
  const statsRef = doc(db, "users", uid, "stats", "main");
  const statsDoc = await getDoc(statsRef);

  if (!statsDoc.exists()) {
    await setDoc(statsRef, {
      totalQuestionsGenerated: 0,
      totalQuestionsSolved: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      totalDocuments: 0,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDateKey: today,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const data = statsDoc.data();
  const lastActive: string = data.lastActiveDateKey ?? "";
  const prevStreak: number = data.currentStreak ?? 0;
  const prevLongest: number = data.longestStreak ?? 0;

  const yesterday = getDateKey(1);
  const newStreak = lastActive === yesterday ? prevStreak + 1 : 1;
  const newLongest = Math.max(prevLongest, newStreak);

  await updateDoc(statsRef, {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActiveDateKey: today,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Increments the login count for today's activity log.
 * Called once per login event (not on page load).
 * Uses merge so it's safe even if the doc doesn't exist yet.
 */
export async function incrementLoginCount(uid: string): Promise<void> {
  const today = getDateKey(0);
  const activityRef = doc(db, "users", uid, "activityLogs", today);
  await setDoc(activityRef, { loginCount: increment(1) }, { merge: true });
}

/**
 * Fetches login counts for the last N days.
 * Returns a map of dateKey → loginCount (0 if no data for that day).
 * Uses loginCount when available, falls back to activeCount for legacy docs.
 */
export async function getActivityLogs(
  uid: string,
  days: number = 64
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dateKeys.push(getDateKey(i));
  }

  await Promise.allSettled(
    dateKeys.map(async (dateKey) => {
      result[dateKey] = 0; // default
      const logDoc = await getDoc(doc(db, "users", uid, "activityLogs", dateKey));
      if (logDoc.exists()) {
        const data = logDoc.data();
        result[dateKey] = data.loginCount ?? data.activeCount ?? 0;
      }
    })
  );

  return result;
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getDashboardStats(uid: string): Promise<DashboardStats> {
  const statsDoc = await getDoc(doc(db, "users", uid, "stats", "main"));

  if (!statsDoc.exists()) {
    return {
      totalQuestionsGenerated: 0,
      totalQuestionsSolved: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDateKey: "",
    };
  }

  const d = statsDoc.data();
  return {
    totalQuestionsGenerated: d.totalQuestionsGenerated ?? 0,
    totalQuestionsSolved: d.totalQuestionsSolved ?? 0,
    totalCorrectAnswers: d.totalCorrectAnswers ?? 0,
    totalWrongAnswers: d.totalWrongAnswers ?? 0,
    currentStreak: d.currentStreak ?? 0,
    longestStreak: d.longestStreak ?? 0,
    lastActiveDateKey: d.lastActiveDateKey ?? "",
  };
}

/** Top N documents with success stats. */
export async function getDocumentStats(
  uid: string,
  maxItems: number = 4
): Promise<DocumentStat[]> {
  const colRef = collection(db, "users", uid, "documents");
  const q = query(colRef, orderBy("createdAt", "desc"), limit(maxItems));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    const answered: number = data.answeredQuestions ?? 0;
    const correct: number = data.correctAnswers ?? 0;
    const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    return {
      id: d.id,
      name: data.name ?? "Bilinmeyen Doküman",
      answeredQuestions: answered,
      correctAnswers: correct,
      successRate: rate,
    };
  });
}

/** Total document count for the user (uses server-side count). */
export async function getTotalDocuments(uid: string): Promise<number> {
  try {
    const colRef = collection(db, "users", uid, "documents");
    const snap = await getCountFromServer(colRef);
    return snap.data().count;
  } catch (err) {
    console.error("[getTotalDocuments] Failed:", err);
    return 0;
  }
}

/**
 * Returns activity data for the last 7 days (oldest → today).
 * Any day with no log defaults to activeCount = 0.
 */
export async function getLast7DaysActivity(uid: string): Promise<ActivityDay[]> {
  // Build array: index 0 = 6 days ago, index 6 = today
  const days: ActivityDay[] = Array.from({ length: 7 }, (_, i) => {
    const key = getDateKey(6 - i);
    return { dateKey: key, label: getDayLabel(key), activeCount: 0 };
  });

  const results = await Promise.allSettled(
    days.map(async (day) => {
      const logDoc = await getDoc(
        doc(db, "users", uid, "activityLogs", day.dateKey)
      );
      if (logDoc.exists()) {
        const data = logDoc.data();
        // loginCount tracks how many times the user actually logged in that day.
        // activeCount is the legacy field (always 1); prefer loginCount when available.
        const count: number = data.loginCount ?? data.activeCount ?? 0;
        return { ...day, activeCount: count };
      }
      return day;
    })
  );

  return results.map((result, idx) =>
    result.status === "fulfilled" ? result.value : days[idx]
  );
}

/** Last N uploaded documents for the user. */
export async function fetchRecentDocuments(
  uid: string,
  maxItems: number = 5
): Promise<IDocument[]> {
  const colRef = collection(db, "users", uid, "documents");
  const q = query(colRef, orderBy("createdAt", "desc"), limit(maxItems));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as {
      name: string;
      size: number;
      mimeType?: string;
      url: string | null;
      storagePath: string | null;
      storageEnabled?: boolean;
      createdAt: Timestamp;
    };

    return {
      id: d.id,
      name: data.name,
      size: data.size,
      mimeType: data.mimeType,
      url: data.url ?? null,
      storagePath: data.storagePath ?? null,
      storageEnabled: data.storageEnabled,
      createdAt:
        data.createdAt
          ?.toDate()
          .toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }) ?? "",
    };
  });
}
