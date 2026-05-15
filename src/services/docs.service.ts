import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  StorageError,
} from "firebase/storage";
import { app } from "./firebase.config";
import { features } from "../config/features";
import type { IDocument } from "../components/docs/types";

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Returns a sanitized filename safe for use in Storage paths.
 */
function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Translates a Storage error into a user-readable Turkish message.
 */
function getStorageErrorMessage(error: unknown): string {
  if (error instanceof StorageError) {
    switch (error.code) {
      case "storage/unauthorized":
        return "Bu dosyayı yüklemek için yetkiniz yok. Lütfen tekrar giriş yapın.";
      case "storage/canceled":
        return "Dosya yükleme iptal edildi.";
      case "storage/quota-exceeded":
        return "Storage kotası doldu.";
      case "storage/unauthenticated":
        return "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.";
      case "storage/unknown":
      default: {
        const msg = error.message ?? "";
        if (
          msg.includes("CORS") ||
          msg.includes("XMLHttpRequest") ||
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError")
        ) {
          return "Dosya yükleme için Storage CORS ayarı eksik olabilir. Lütfen yöneticinize başvurun.";
        }
        return "Dosya yükleme sırasında bir hata oluştu. Lütfen tekrar deneyin.";
      }
    }
  }
  return "Dosya yükleme sırasında bir hata oluştu. Lütfen tekrar deneyin.";
}

/**
 * Upload a document.
 *
 * When `features.enableStorage` is true:
 *   - Uploads file bytes to Firebase Storage
 *   - Saves metadata + download URL to Firestore
 *
 * When `features.enableStorage` is false:
 *   - Skips Storage entirely (no bucket needed)
 *   - Saves metadata-only record to Firestore with url/storagePath = null
 */
export async function uploadDocument(
  uid: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<IDocument> {
  const colRef = collection(db, "users", uid, "documents");
  const createdAtFormatted = new Date().toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (!features.enableStorage) {
    // ── Storage-disabled path: metadata only ───────────────────────────────
    const docData = {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      url: null,
      storagePath: null,
      storageEnabled: false,
      answeredQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(colRef, docData);
      onProgress?.(100);
      return {
        id: docRef.id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        url: null,
        storagePath: null,
        storageEnabled: false,
        createdAt: createdAtFormatted,
      };
    } catch (err) {
      console.error("[uploadDocument] Firestore write failed:", err);
      throw new Error(
        "Doküman kaydı oluşturulurken bir hata oluştu. Firestore izinlerini kontrol edin."
      );
    }
  }

  // ── Storage-enabled path ─────────────────────────────────────────────────
  const fileName = `${Date.now()}_${safeFileName(file.name)}`;
  const storagePath = `users/${uid}/documents/${fileName}`;
  const storageRef = ref(storage, storagePath);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      (error) => {
        console.error("[uploadDocument] Storage upload error:", error);
        reject(new Error(getStorageErrorMessage(error)));
      },
      () => resolve()
    );
  });

  const url = await getDownloadURL(storageRef);

  const docData = {
    name: file.name,
    size: file.size,
    mimeType: file.type,
    url,
    storagePath,
    storageEnabled: true,
    answeredQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(colRef, docData);

  return {
    id: docRef.id,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    url,
    storagePath,
    storageEnabled: true,
    createdAt: createdAtFormatted,
  };
}

/**
 * Fetch all documents for a user from Firestore, ordered by createdAt desc.
 */
export async function fetchDocuments(uid: string): Promise<IDocument[]> {
  const colRef = collection(db, "users", uid, "documents");
  const q = query(colRef, orderBy("createdAt", "desc"));
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

/**
 * Delete a document from Firestore. Also removes the Storage file if a
 * storagePath is present and Storage is enabled.
 */
export async function deleteDocument(
  uid: string,
  documentId: string,
  storagePath: string | null
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "documents", documentId));

  if (!storagePath) return;

  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (storageError) {
    // Log but don't throw — Firestore record is already deleted.
    console.error(
      "[deleteDocument] Storage delete failed (Firestore record deleted):",
      storageError
    );
  }
}
