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

const db = getFirestore(app);

function chatsCol(uid: string) {
  return collection(db, "users", uid, "aiChats");
}

function messagesCol(uid: string, chatId: string) {
  return collection(db, "users", uid, "aiChats", chatId, "messages");
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
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
      };
    });
  } catch (err) {
    console.error("[fetchUserChats] Error:", err);
    throw new Error("Sohbet geçmişi yüklenemedi.");
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
      };
    });
  } catch (err) {
    console.error("[fetchChatMessages] Error:", err);
    throw new Error("Mesajlar yüklenemedi.");
  }
}

export async function createChat(
  uid: string,
  model: GeminiModelId,
  title = "Yeni sohbet"
): Promise<string> {
  const ref = await addDoc(chatsCol(uid), {
    title,
    model,
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
    throw new Error("Sohbet silinemedi.");
  }
}

export async function updateChatMeta(
  uid: string,
  chatId: string,
  patch: { title?: string; model?: GeminiModelId }
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "aiChats", chatId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function saveMessage(
  uid: string,
  chatId: string,
  role: AiChatMessage["role"],
  content: string,
  attachments?: ChatAttachmentMeta[]
): Promise<string> {
  const ref = await addDoc(messagesCol(uid, chatId), {
    role,
    content,
    createdAt: serverTimestamp(),
    ...(attachments?.length ? { attachments } : {}),
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
