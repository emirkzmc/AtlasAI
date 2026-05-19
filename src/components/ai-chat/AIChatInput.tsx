import {useEffect, useRef, useState, type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import {GEMINI_MODELS} from "../../constants/aiChat.constants";
import type {ChatAttachmentMeta, GeminiModelId} from "../../types/aiChat.types";
import type {IDocument} from "../docs/types";

type AIChatInputProps = {
    selectedModel: GeminiModelId;
    onModelChange: (m: GeminiModelId) => void;
    onSend: (text: string) => void;
    onAddDocument: (document: IDocument) => void;
    availableDocuments: IDocument[];
    isLoadingDocuments: boolean;
    attachments: ChatAttachmentMeta[];
    onRemoveAttachment: (index: number) => void;
    disabled?: boolean;
    placement?: "bottom" | "inline";
};

export default function AIChatInput({
                                        selectedModel,
                                        onModelChange,
                                        onSend,
                                        onAddDocument,
                                        availableDocuments,
                                        isLoadingDocuments,
                                        attachments,
                                        onRemoveAttachment,
                                        disabled = false,
                                        placement = "bottom",
                                    }: AIChatInputProps) {
    const [text, setText] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
    const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
    const [documentPickerRect, setDocumentPickerRect] = useState<DOMRect | null>(null);
    const modelButtonRef = useRef<HTMLButtonElement>(null);
    const documentButtonRef = useRef<HTMLButtonElement>(null);

    const modelLabel =
        GEMINI_MODELS.find((m) => m.id === selectedModel)?.label ?? selectedModel;

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
        if (!dropdownOpen) return;

        const updatePosition = () => {
            setDropdownRect(modelButtonRef.current?.getBoundingClientRect() ?? null);
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [dropdownOpen]);

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
        return document.mimeType?.split("/").pop()?.toUpperCase() ||
            document.type?.split("/").pop()?.toUpperCase() ||
            document.name.split(".").pop()?.toUpperCase() ||
            "DOSYA";
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
        const allowedExtensions = ["pdf", "txt", "pptx", "ppt", "docx", "doc", "jpg", "jpeg", "png"];
        return allowedExtensions.includes(ext) || type.startsWith("image/") || type === "text/plain" || type === "application/pdf" || type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
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
                    {attachments.map((a, i) => (
                        <span
                            key={`${a.name}-${i}`}
                            className="inline-flex items-center gap-1.5 text-[12px] bg-white/80 text-[#5B4F4B] px-3 py-1 rounded-full border border-[#D4C4C4]"
                        >
              <span className="max-w-35 truncate">{a.name}</span>
              <button
                  type="button"
                  onClick={() => onRemoveAttachment(i)}
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
              placeholder="Fizik sorusu sorun veya doküman ekleyin"
              rows={2}
              className="w-full bg-transparent text-white/90 placeholder:text-white/50 text-[15px] px-6 pt-5 pb-2 resize-none border-0 outline-none min-h-[56px] max-h-[120px] font-[inherit]"
          />

                    <div className="flex items-end justify-between px-4 pb-4 pt-1">
                        <button
                            ref={documentButtonRef}
                            type="button"
                            onClick={() => setDocumentPickerOpen((open) => !open)}
                            disabled={disabled}
                            className="w-10 h-10 flex items-center justify-center rounded-full  hover:bg-white/25 text-white text-2xl font-light transition-colors cursor-pointer border-0 shrink-0 disabled:opacity-50"
                            aria-label="Doküman seç"
                        >
                            +
                        </button>
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
                                            className="fixed z-200 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-[#E5E5E5] bg-white shadow-xl overflow-hidden"
                                            style={{
                                                left: Math.max(
                                                    12,
                                                    Math.min(documentPickerRect.left, window.innerWidth - 372)
                                                ),
                                                top: Math.min(documentPickerRect.bottom + 10, window.innerHeight - 360),
                                            }}
                                        >
                                            <div className="px-4 py-3 border-b border-[#EFEFEF]">
                                                <p className="m-0 text-[13px] font-semibold text-[#1a1a1a]">
                                                    Doküman seç
                                                </p>
                                                <p className="m-0 mt-0.5 text-[11px] text-[#737373]">
                                                    Dokümanlarım sayfasındaki kayıtlar
                                                </p>
                                            </div>

                                            <div className="max-h-[280px] overflow-y-auto p-2">
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
                                                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                                                                        selected
                                                                            ? "bg-[#F3F0EF] text-[#5B4F4B]"
                                                                            : getReadabilityLabel(document) === "İçerik yok"
                                                                              ? "bg-amber-50 text-amber-700"
                                                                              : "bg-[#F3F0EF] text-[#5B4F4B]"
                                                                    }`}>
                                                                        {selected ? "Eklendi" : getReadabilityLabel(document)}
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

                        <div className="relative">
                            <button
                                ref={modelButtonRef}
                                type="button"
                                onClick={() => setDropdownOpen((o) => !o)}
                                disabled={disabled}
                                className="flex items-center gap-1.5 text-white/95 text-[14px] font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent disabled:opacity-50"
                            >
                                {modelLabel}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </button>
                            {dropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-190"
                                        onClick={() => setDropdownOpen(false)}
                                        aria-hidden
                                    />
                                    {dropdownRect &&
                                        createPortal(
                                            <ul
                                                className="fixed z-200 bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1 min-w-[220px] list-none m-0"
                                                style={{
                                                    left: Math.max(
                                                        12,
                                                        Math.min(dropdownRect.right - 220, window.innerWidth - 232)
                                                    ),
                                                    top: Math.max(12, dropdownRect.top - 190),
                                                }}
                                            >
                                                {GEMINI_MODELS.map((m) => (
                                                    <li key={m.id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onModelChange(m.id);
                                                                setDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-[#F3F0EF] cursor-pointer border-0 bg-transparent ${
                                                                m.id === selectedModel
                                                                    ? "text-[#5B4F4B] font-semibold"
                                                                    : "text-[#535353]"
                                                            }`}
                                                        >
                                                            {m.label}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>,
                                            document.body
                                        )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSendClick}
                    disabled={disabled || !text.trim()}
                    className="sr-only"
                >
                    Gönder
                </button>
            </div>
        </div>
    );
}
