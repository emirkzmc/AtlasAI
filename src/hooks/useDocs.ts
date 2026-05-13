import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  uploadDocument,
  fetchDocuments,
  deleteDocument,
} from "../services/docs.service";
import type { IDocument } from "../components/docs/types";

interface UseDocsReturn {
  documents: IDocument[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  upload: (files: File[]) => Promise<void>;
  remove: (id: string, storagePath: string) => Promise<void>;
  open: (url: string) => void;
}

export function useDocs(): UseDocsReturn {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

      try {
        // Upload sequentially so progress is meaningful
        const uploaded: IDocument[] = [];
        for (const file of files) {
          const doc = await uploadDocument(user.uid, file, (pct) => {
            setUploadProgress(pct);
          });
          uploaded.push(doc);
        }
        setDocuments((prev) => [...uploaded, ...prev]);
      } catch {
        setError("Dosya yüklenirken bir hata oluştu. Lütfen tekrar deneyin.");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [user?.uid]
  );

  const remove = useCallback(
    async (id: string, storagePath: string) => {
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

  const open = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return {
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    upload,
    remove,
    open,
  };
}
