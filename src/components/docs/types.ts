export interface IDocument {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  url: string | null;
  storagePath: string | null;
  storageEnabled?: boolean;
  createdAt: string;
}
