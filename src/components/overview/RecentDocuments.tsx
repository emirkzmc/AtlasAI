import { useState } from "react";
import toast from "react-hot-toast";
import type { IDocument } from "../docs/types";

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon() {
  return (
    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
      <svg
        className="w-5 h-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    </div>
  );
}

interface RecentDocumentsProps {
  documents: IDocument[];
  onOpen: (url: string) => void;
  onDelete: (id: string, storagePath: string | null) => Promise<void>;
}

export default function RecentDocuments({
  documents,
  onOpen,
  onDelete,
}: RecentDocumentsProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (documents.length === 0) return null;

  async function handleDelete(doc: IDocument) {
    setDeletingId(doc.id);
    try {
      await onDelete(doc.id, doc.storagePath);
    } finally {
      setDeletingId(null);
    }
  }

  function handleOpen(doc: IDocument) {
    if (!doc.url) {
      toast("Dosya içeriği buluta yüklenmedi. Firebase Storage aktif olmadığı için bu doküman açılamıyor.", {
        icon: "ℹ️",
        duration: 4000,
      });
      return;
    }
    onOpen(doc.url);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          Son Dökümanlar
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors"
          >
            <DocIcon />

            <div className="flex-1 min-w-0">
              <p
                className="text-[14px] font-medium text-gray-800 truncate"
                title={doc.name}
              >
                {doc.name}
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {formatSize(doc.size)}
                {doc.createdAt ? ` · ${doc.createdAt}` : ""}
                {!doc.url && (
                  <span className="ml-1 text-amber-500"> · Yalnızca kayıt</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {doc.url && (
                <button
                  onClick={() => handleOpen(doc)}
                  className="px-4 py-1.5 border border-gray-200 text-[13px] font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Aç"
                >
                  Aç
                </button>
              )}
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                className="px-4 py-1.5 border border-red-100 text-[13px] font-medium text-red-400 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === doc.id ? "Siliniyor…" : "Sil"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
