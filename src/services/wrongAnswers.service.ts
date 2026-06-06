import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { app } from "./firebase.config";

const db = getFirestore(app);

export interface WrongAnswerItem {
  id: string;
  documentId: string | null;
  documentTitle: string;
  documentName: string;
  category: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: Date | null;
}

function readString(
  data: Record<string, unknown>,
  keys: string[],
  fallback = ""
): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return fallback;
}

function readDate(data: Record<string, unknown>): Date | null {
  const value = data.createdAt;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

export async function fetchWrongAnswers(uid: string): Promise<WrongAnswerItem[]> {
  const colRef = collection(db, "users", uid, "wrongAnswers");
  const snap = await getDocs(query(colRef, orderBy("createdAt", "desc")));

  return snap.docs.map((item) => {
    const data = item.data();
    const documentTitle = readString(
      data,
      ["documentTitle", "documentName", "pdfName", "fileName"],
      "Bilinmeyen doküman"
    );

    return {
      id: item.id,
      documentId: readString(data, ["documentId"], "") || null,
      documentTitle,
      documentName: documentTitle,
      category: readString(data, ["category", "subject", "lesson"], "Diğer"),
      question: readString(data, ["question", "questionText"], "Soru metni yok"),
      userAnswer: readString(
        data,
        ["selectedAnswerText", "userAnswer", "selectedAnswer", "wrongAnswer"],
        "-"
      ),
      correctAnswer: readString(
        data,
        ["correctAnswerText", "correctAnswer", "answer"],
        "-"
      ),
      explanation: readString(data, ["explanation", "solution"], "Açıklama henüz yok."),
      createdAt: readDate(data),
    };
  });
}
