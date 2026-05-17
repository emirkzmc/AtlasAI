export interface IDocument {
  id: string;
  name: string;
  fileName?: string;
  size: number;
  type?: string;
  mimeType?: string;
  url: string | null;
  downloadURL?: string | null;
  downloadUrl?: string | null;
  fileUrl?: string | null;
  contentUrl?: string | null;
  storagePath: string | null;
  path?: string | null;
  storageEnabled?: boolean;
  extractedText?: string;
  contentText?: string;
  textContent?: string;
  plainText?: string;
  contentStatus?: "ready" | "metadata_only" | "failed";
  extractionError?: string;
  contentTruncated?: boolean;
  createdAt: string;
}
