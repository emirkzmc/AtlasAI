import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { app } from "./firebase.config";
import type {
  AiChatMessage,
  AiChatSummary,
  ChatAttachmentMeta,
  GeminiModelId,
} from "../types/aiChat.types";
import type { AiChatMode } from "../types/quiz.types";
import type { QuizAttemptStatus } from "../types/quiz.types";

const db = getFirestore(app);

function chatsCol(uid: string) {
  return collection(db, "users", uid, "aiChats");
}

function messagesCol(uid: string, chatId: string) {
  return collection(db, "users", uid, "aiChats", chatId, "messages");
}

function normalizeMessageMetadata(
  metadata: AiChatMessage["metadata"] | undefined
): AiChatMessage["metadata"] | undefined {
  if (!metadata) return undefined;
  const createdAt = metadata.quizContext?.createdAt;
  return {
    ...metadata,
    quizContext: metadata.quizContext
      ? {
          ...metadata.quizContext,
          createdAt:
            createdAt instanceof Timestamp
              ? createdAt.toDate()
              : createdAt instanceof Date
                ? createdAt
                : new Date(),
        }
      : undefined,
  };
}

export async function fetchUserChats(uid: string): Promise<AiChatSummary[]> {
  try {
    const q = query(chatsCol(uid), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: (data.title as string) ?? "Yeni sohbet",
        model: (data.model as GeminiModelId) ?? "gemini-2.5-flash",
        mode: data.mode as AiChatMode | undefined,
        documentTitle: typeof data.documentTitle === "string" ? data.documentTitle : null,
        prompt: typeof data.prompt === "string" ? data.prompt : null,
        quizStatus: (data.quizStatus as QuizAttemptStatus | undefined) ?? null,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
      };
    });
  } catch (err) {
    console.error("[fetchUserChats] Error:", err);
    throw new Error("Sohbet geçmişi yüklenemedi.", { cause: err });
  }
}

export async function fetchChatMessages(
  uid: string,
  chatId: string
): Promise<AiChatMessage[]> {
  try {
    const q = query(messagesCol(uid, chatId), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        role: data.role as AiChatMessage["role"],
        content: (data.content as string) ?? "",
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        attachments: data.attachments as ChatAttachmentMeta[] | undefined,
        metadata: normalizeMessageMetadata(
          data.metadata as AiChatMessage["metadata"] | undefined
        ),
      };
    });
  } catch (err) {
    console.error("[fetchChatMessages] Error:", err);
    throw new Error("Mesajlar yüklenemedi.", { cause: err });
  }
}

export async function createChat(
  uid: string,
  model: GeminiModelId,
  title = "Yeni sohbet",
  mode: AiChatMode = "lesson"
): Promise<string> {
  const ref = await addDoc(chatsCol(uid), {
    title,
    model,
    mode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteChat(uid: string, chatId: string): Promise<void> {
  try {
    const messagesSnap = await getDocs(messagesCol(uid, chatId));
    const messageDocs = messagesSnap.docs;

    for (let i = 0; i < messageDocs.length; i += 450) {
      const batch = writeBatch(db);
      messageDocs.slice(i, i + 450).forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
      await batch.commit();
    }

    await deleteDoc(doc(db, "users", uid, "aiChats", chatId));
  } catch (err) {
    console.error("[deleteChat] Error:", err);
    throw new Error("Sohbet silinemedi.", { cause: err });
  }
}

export async function updateChatMeta(
  uid: string,
  chatId: string,
  patch: {
    title?: string;
    model?: GeminiModelId;
    mode?: AiChatMode;
    documentTitle?: string | null;
    prompt?: string | null;
    quizStatus?: QuizAttemptStatus | null;
  }
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "aiChats", chatId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function updateMessageMetadata(
  uid: string,
  chatId: string,
  messageId: string,
  metadataPatch: Partial<NonNullable<AiChatMessage["metadata"]>>
): Promise<void> {
  const updates: Record<string, any> = {};
  for (const [key, val] of Object.entries(metadataPatch)) {
    updates[`metadata.${key}`] = val;
  }
  await updateDoc(doc(db, "users", uid, "aiChats", chatId, "messages", messageId), updates);
}

export async function saveMessage(
  uid: string,
  chatId: string,
  role: AiChatMessage["role"],
  content: string,
  attachments?: ChatAttachmentMeta[],
  metadata?: AiChatMessage["metadata"]
): Promise<string> {
  const ref = await addDoc(messagesCol(uid, chatId), {
    role,
    content,
    createdAt: serverTimestamp(),
    ...(attachments?.length ? { attachments } : {}),
    ...(metadata ? { metadata } : {}),
  });
  await updateDoc(doc(db, "users", uid, "aiChats", chatId), {
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** İlk kullanıcı mesajından sohbet başlığı üret */
export function titleFromMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 42) return t || "Yeni sohbet";
  return `${t.slice(0, 42)}…`;
}
