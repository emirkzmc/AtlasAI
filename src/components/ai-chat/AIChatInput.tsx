import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { ChatAttachmentMeta, GeminiModelId } from "../../types/aiChat.types";
import type { AiChatMode } from "../../types/quiz.types";
import type { IDocument } from "../docs/types";
import ModelSelector from "./ModelSelector";
import ModeSelector from "./ModeSelector";

type AIChatInputProps = {
  selectedModel: GeminiModelId;
  onModelChange: (model: GeminiModelId) => void;
  chatMode: AiChatMode;
  onModeChange: (mode: AiChatMode) => void;
  onSend: (text: string) => void;
  onAddDocument: (document: IDocument) => void;
  availableDocuments: IDocument[];
  isLoadingDocuments: boolean;
  attachments: ChatAttachmentMeta[];
  onRemoveAttachment: (index: number) => void;
  disabled?: boolean;
  placement?: "bottom" | "inline";
  placeholder?: string;
  modeLocked?: boolean;
};

export default function AIChatInput({
  selectedModel,
  onModelChange,
  chatMode,
  onModeChange,
  onSend,
  onAddDocument,
  availableDocuments,
  isLoadingDocuments,
  attachments,
  onRemoveAttachment,
  disabled = false,
  placement = "bottom",
  placeholder = "Fizik sorusu sorun veya doküman ekleyin",
  modeLocked = false,
}: AIChatInputProps) {
  const [text, setText] = useState("");
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [documentPickerRect, setDocumentPickerRect] = useState<DOMRect | null>(null);
  const documentButtonRef = useRef<HTMLButtonElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSend(text);
        setText("");
      }
    }
  }

  function handleSendClick() {
    if (text.trim()) {
      onSend(text);
      setText("");
    }
  }

  useEffect(() => {
    if (!documentPickerOpen) return;

    const updatePosition = () => {
      setDocumentPickerRect(documentButtonRef.current?.getBoundingClientRect() ?? null);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [documentPickerOpen]);

  function formatBytes(bytes: number): string {
    if (!bytes) return "0 KB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function getFileType(document: IDocument): string {
    return (
      document.mimeType?.split("/").pop()?.toUpperCase() ||
      document.type?.split("/").pop()?.toUpperCase() ||
      document.name.split(".").pop()?.toUpperCase() ||
      "DOSYA"
    );
  }

  function isSelected(document: IDocument): boolean {
    return attachments.some((attachment) => attachment.id === document.id);
  }

  function hasDocumentText(document: IDocument): boolean {
    return Boolean(
      document.extractedText?.trim() ||
        document.contentText?.trim() ||
        document.textContent?.trim() ||
        document.plainText?.trim()
    );
  }

  function hasDocumentFileAccess(document: IDocument): boolean {
    return Boolean(
      document.downloadURL?.trim() ||
        document.downloadUrl?.trim() ||
        document.fileUrl?.trim() ||
        document.contentUrl?.trim() ||
        document.url?.trim() ||
        document.storagePath?.trim() ||
        document.path?.trim()
    );
  }

  function isSupportedDoc(document: IDocument): boolean {
    const ext = document.name.split(".").pop()?.toLowerCase() || "";
    const type = document.mimeType || document.type || "";
    const allowedExtensions = [
      "pdf",
      "txt",
      "pptx",
      "ppt",
      "docx",
      "doc",
      "jpg",
      "jpeg",
      "png",
    ];
    return (
      allowedExtensions.includes(ext) ||
      type.startsWith("image/") ||
      type === "text/plain" ||
      type === "application/pdf" ||
      type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
  }

  function getReadabilityLabel(document: IDocument): string {
    if (!isSupportedDoc(document)) return "Destek yok";
    if (hasDocumentText(document)) return "Okunabilir";
    if (hasDocumentFileAccess(document)) return "Dosyadan oku";
    return "İçerik yok";
  }

  const isInline = placement === "inline";

  return (
    <div
      className={
        isInline
          ? "w-full"
          : "absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-6 pt-2 bg-linear-to-t from-[#E8E8E8] via-[#E8E8E8] to-transparent"
      }
    >
      {attachments.length > 0 && (
        <div className={`flex flex-wrap gap-2 mb-2 ${isInline ? "w-full" : "max-w-180 mx-auto"}`}>
          {attachments.map((attachment, index) => (
            <span
              key={`${attachment.name}-${index}`}
              className="inline-flex items-center gap-1.5 text-[12px] bg-white/80 text-[#5B4F4B] px-3 py-1 rounded-full border border-[#D4C4C4]"
            >
              <span className="max-w-35 truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(index)}
                className="text-[#999] hover:text-[#5B4F4B] cursor-pointer border-0 bg-transparent p-0 leading-none"
                aria-label="Dosyayı kaldır"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={`${isInline ? "w-full" : "max-w-180 mx-auto"} relative`}>
        <div className="bg-[#977F7F] rounded-[28px] min-h-30 flex flex-col shadow-lg overflow-hidden">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={2}
            className="w-full bg-transparent text-white/90 placeholder:text-white/50 text-[15px] px-6 pt-5 pb-2 resize-none border-0 outline-none min-h-14 max-h-30 font-[inherit]"
          />

          <div className="flex flex-wrap items-end justify-between gap-2 px-4 pb-4 pt-1">
            <div className="flex items-center gap-2">
              <button
                ref={documentButtonRef}
                type="button"
                onClick={() => setDocumentPickerOpen((open) => !open)}
                disabled={disabled}
                className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/25 text-white text-2xl font-light transition-transform duration-300 cursor-pointer border-0 shrink-0 disabled:opacity-50 bg-transparent ${documentPickerOpen ? "rotate-45" : ""}`}
                aria-label="Doküman seç"
              >
                +
              </button>
              {!modeLocked && (
                <ModeSelector
                  value={chatMode}
                  onChange={onModeChange}
                  disabled={disabled}
                />
              )}
            </div>

            {documentPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-190"
                  onClick={() => setDocumentPickerOpen(false)}
                  aria-hidden
                />
                {documentPickerRect &&
                  createPortal(
                    <div
                      className="fixed z-200 w-90 max-w-[calc(100vw-24px)] rounded-2xl border border-[#E5E5E5] bg-white shadow-xl overflow-hidden"
                      style={{
                        left: Math.max(
                          12,
                          Math.min(documentPickerRect.left, window.innerWidth - 372)
                        ),
                        bottom: Math.max(12, window.innerHeight - documentPickerRect.top + 10),
                      }}
                    >
                      <div className="px-4 py-3 border-b border-[#EFEFEF]">
                        <p className="m-0 text-[13px] font-semibold text-[#1a1a1a]">
                          Doküman seç
                        </p>
                        <p className="m-0 mt-0.5 text-[11px] text-[#737373]">
                          Tek doküman seçilir; yeni seçim mevcut dokümanı değiştirir.
                        </p>
                      </div>

                      <div className="max-h-70 overflow-y-auto p-2">
                        {isLoadingDocuments ? (
                          <div className="px-3 py-8 text-center text-[13px] text-[#737373]">
                            Dokümanlar yükleniyor...
                          </div>
                        ) : availableDocuments.length === 0 ? (
                          <div className="px-3 py-8 text-center text-[13px] text-[#737373]">
                            Henüz doküman yüklenmemiş.
                          </div>
                        ) : (
                          availableDocuments.map((document) => {
                            const selected = isSelected(document);
                            const readabilityLabel = getReadabilityLabel(document);

                            return (
                              <button
                                key={document.id}
                                type="button"
                                onClick={() => {
                                  if (!selected) onAddDocument(document);
                                  setDocumentPickerOpen(false);
                                }}
                                disabled={selected || disabled}
                                className="w-full rounded-xl border-0 bg-transparent px-3 py-3 text-left transition-colors hover:bg-[#F5F2F1] disabled:cursor-default disabled:opacity-60"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="m-0 truncate text-[13px] font-medium text-[#1a1a1a]">
                                      {document.name}
                                    </p>
                                    <p className="m-0 mt-1 text-[11px] text-[#737373]">
                                      {getFileType(document)} · {document.createdAt || "Tarih yok"} · {formatBytes(document.size)}
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                                      selected
                                        ? "bg-[#F3F0EF] text-[#5B4F4B]"
                                        : readabilityLabel === "İçerik yok"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-[#F3F0EF] text-[#5B4F4B]"
                                    }`}
                                  >
                                    {selected ? "Eklendi" : readabilityLabel}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
              </>
            )}

            <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
              <ModelSelector
                value={selectedModel}
                onChange={onModelChange}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={handleSendClick}
                disabled={disabled || !text.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer border-0 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Gönder"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
