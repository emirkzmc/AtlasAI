import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  uploadDocument,
  fetchDocuments,
  deleteDocument,
} from "../services/docs.service";
import { features } from "../config/features";
import type { IDocument } from "../components/docs/types";

const STORAGE_DISABLED_MESSAGE =
  "Doküman kaydı oluşturuldu. Firebase Storage aktif olmadığı için dosya içeriği şu an buluta yüklenmedi.";

interface UseDocsReturn {
  documents: IDocument[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  uploadInfo: string | null;
  upload: (files: File[]) => Promise<void>;
  remove: (id: string, storagePath: string | null) => Promise<void>;
  open: (url: string | null) => void;
}

export function useDocs(): UseDocsReturn {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  // Fetch on mount / user change
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    fetchDocuments(user.uid)
      .then(setDocuments)
      .catch(() => setError("Dokümanlar yüklenirken bir hata oluştu."))
      .finally(() => setIsLoading(false));
  }, [user?.uid]);

  const upload = useCallback(
    async (files: File[]) => {
      if (!user?.uid) return;
      setIsUploading(true);
      setError(null);
      setUploadInfo(null);

      try {
        const uploaded: IDocument[] = [];
        for (const file of files) {
          const uploadedDoc = await uploadDocument(user.uid, file, (pct) => {
            setUploadProgress(pct);
          });
          uploaded.push(uploadedDoc);
        }
        setDocuments((prev) => [...uploaded, ...prev]);

        const truncated = uploaded.some((doc) => doc.contentTruncated);
        const readyCount = uploaded.filter((doc) => doc.contentStatus === "ready").length;
        const infoMessages: string[] = [];
        if (!features.enableStorage) infoMessages.push(STORAGE_DISABLED_MESSAGE);
        if (readyCount > 0) {
          infoMessages.push(`${readyCount} dokümanın içeriği AI için hazırlandı.`);
        }
        if (truncated) {
          infoMessages.push("Bazı dokümanlar uzun olduğu için ilk bölümü işlendi.");
        }
        if (infoMessages.length) setUploadInfo(infoMessages.join(" "));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Dosya yüklenirken bir hata oluştu. Lütfen tekrar deneyin.";
        setError(message);
        console.error("[useDocs] upload failed:", err);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [user?.uid]
  );

  const remove = useCallback(
    async (id: string, storagePath: string | null) => {
      if (!user?.uid) return;
      setError(null);

      // Optimistic update
      setDocuments((prev) => prev.filter((d) => d.id !== id));

      try {
        await deleteDocument(user.uid, id, storagePath);
      } catch {
        setError("Dosya silinirken bir hata oluştu.");
        // Re-fetch to restore state on failure
        fetchDocuments(user.uid).then(setDocuments).catch(() => null);
      }
    },
    [user?.uid]
  );

  const open = useCallback((url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return {
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    uploadInfo,
    upload,
    remove,
    open,
  };
}
