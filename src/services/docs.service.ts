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
  type FieldValue,
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
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

const db = getFirestore(app);
const storage = getStorage(app);
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_EXTRACTED_TEXT_CHARS = 120_000;

type DocumentContentStatus = "ready" | "metadata_only" | "failed";

interface ExtractedContent {
  status: DocumentContentStatus;
  text?: string;
  error?: string;
  truncated?: boolean;
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isTxtFile(file: File): boolean {
  return file.type === "text/plain" || getFileExtension(file.name) === "txt";
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || getFileExtension(file.name) === "pdf";
}

function clipExtractedText(text: string): { text: string; truncated: boolean } {
  const normalized = text.replace(/\s+\n/g, "\n").trim();
  if (normalized.length <= MAX_EXTRACTED_TEXT_CHARS) {
    return { text: normalized, truncated: false };
  }
  return {
    text: normalized.slice(0, MAX_EXTRACTED_TEXT_CHARS),
    truncated: true,
  };
}

async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    if (pageText.trim()) pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function extractDocumentContent(file: File): Promise<ExtractedContent> {
  try {
    if (isTxtFile(file)) {
      const clipped = clipExtractedText(await file.text());
      return {
        status: clipped.text ? "ready" : "metadata_only",
        text: clipped.text || undefined,
        truncated: clipped.truncated,
      };
    }

    if (isPdfFile(file)) {
      const clipped = clipExtractedText(await extractPdfText(file));
      return {
        status: clipped.text ? "ready" : "metadata_only",
        text: clipped.text || undefined,
        truncated: clipped.truncated,
      };
    }

    return { status: "metadata_only" };
  } catch (error) {
    console.error("[uploadDocument] Content extraction failed:", error);
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "İçerik çıkarılamadı.",
    };
  }
}

function buildContentFields(extraction: ExtractedContent): {
  contentStatus: DocumentContentStatus;
  extractedText?: string;
  extractedAt?: FieldValue;
  extractionError?: string;
  contentTruncated?: boolean;
} {
  return {
    contentStatus: extraction.status,
    ...(extraction.text
      ? {
          extractedText: extraction.text,
          extractedAt: serverTimestamp(),
        }
      : {}),
    ...(extraction.error ? { extractionError: extraction.error } : {}),
    ...(extraction.truncated ? { contentTruncated: true } : {}),
  };
}

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
  const extraction = await extractDocumentContent(file);
  const contentFields = buildContentFields(extraction);

  if (!features.enableStorage) {
    // ── Storage-disabled path: metadata only ───────────────────────────────
    const docData = {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      url: null,
      storagePath: null,
      storageEnabled: false,
      ...contentFields,
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
        contentStatus: extraction.status,
        extractedText: extraction.text,
        extractionError: extraction.error,
        contentTruncated: extraction.truncated,
        createdAt: createdAtFormatted,
      };
    } catch (err) {
      console.error("[uploadDocument] Firestore write failed:", err);
      throw new Error(
        "Doküman kaydı oluşturulurken bir hata oluştu. Firestore izinlerini kontrol edin.",
        { cause: err }
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
        reject(new Error(getStorageErrorMessage(error), { cause: error }));
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
    downloadURL: url,
    storagePath,
    storageEnabled: true,
    ...contentFields,
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
    downloadURL: url,
    storagePath,
    storageEnabled: true,
    contentStatus: extraction.status,
    extractedText: extraction.text,
    extractionError: extraction.error,
    contentTruncated: extraction.truncated,
    createdAt: createdAtFormatted,
  };
}

function readString(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function readNumber(data: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function readTimestampDate(data: Record<string, unknown>): string {
  const value = data.createdAt ?? data.uploadedAt;
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (value instanceof Date) {
    return value.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return "";
}

/**
 * Fetch all documents for a user from Firestore, ordered by createdAt desc.
 */
export async function fetchDocuments(uid: string): Promise<IDocument[]> {
  const colRef = collection(db, "users", uid, "documents");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    const name = readString(data, ["name", "fileName"]) ?? "Bilinmeyen doküman";
    const url =
      readString(data, ["downloadURL", "downloadUrl", "fileUrl", "contentUrl", "url"]) ??
      null;
    const storagePath = readString(data, ["storagePath", "path"]) ?? null;
    const contentStatus = readString(data, ["contentStatus"]) as
      | IDocument["contentStatus"]
      | undefined;

    return {
      id: d.id,
      name,
      fileName: readString(data, ["fileName"]),
      size: readNumber(data, ["size", "fileSize"]),
      type: readString(data, ["type"]),
      mimeType: readString(data, ["mimeType", "type"]),
      url,
      downloadURL: readString(data, ["downloadURL"]),
      downloadUrl: readString(data, ["downloadUrl"]),
      fileUrl: readString(data, ["fileUrl"]),
      contentUrl: readString(data, ["contentUrl"]),
      storagePath,
      path: readString(data, ["path"]),
      storageEnabled: typeof data.storageEnabled === "boolean" ? data.storageEnabled : undefined,
      extractedText: readString(data, ["extractedText"]),
      contentText: readString(data, ["contentText"]),
      textContent: readString(data, ["textContent"]),
      plainText: readString(data, ["plainText"]),
      contentStatus,
      extractionError: readString(data, ["extractionError"]),
      contentTruncated:
        typeof data.contentTruncated === "boolean" ? data.contentTruncated : undefined,
      createdAt: readTimestampDate(data),
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
