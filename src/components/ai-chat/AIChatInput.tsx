import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { GEMINI_MODELS } from "../../constants/aiChat.constants";
import { AI_CHAT_ACCEPTED_EXTENSIONS } from "../../constants/aiChat.constants";
import type { ChatAttachmentMeta, GeminiModelId } from "../../types/aiChat.types";

type AIChatInputProps = {
  selectedModel: GeminiModelId;
  onModelChange: (m: GeminiModelId) => void;
  onSend: (text: string) => void;
  onAddFile: (file: File) => void;
  attachments: ChatAttachmentMeta[];
  onRemoveAttachment: (index: number) => void;
  disabled?: boolean;
};

export default function AIChatInput({
  selectedModel,
  onModelChange,
  onSend,
  onAddFile,
  attachments,
  onRemoveAttachment,
  disabled = false,
}: AIChatInputProps) {
  const [text, setText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-6 pt-2 bg-gradient-to-t from-[#E8E8E8] via-[#E8E8E8] to-transparent">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-w-[720px] mx-auto">
          {attachments.map((a, i) => (
            <span
              key={`${a.name}-${i}`}
              className="inline-flex items-center gap-1.5 text-[12px] bg-white/80 text-[#5B4F4B] px-3 py-1 rounded-full border border-[#D4C4C4]"
            >
              <span className="max-w-[140px] truncate">{a.name}</span>
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

      <div className="max-w-[720px] mx-auto relative">
        <div className="bg-[#7A5C5C] rounded-[28px] min-h-[120px] flex flex-col shadow-lg overflow-hidden">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Soru sorun"
            rows={2}
            className="w-full bg-transparent text-white/90 placeholder:text-white/50 text-[15px] px-6 pt-5 pb-2 resize-none border-0 outline-none min-h-[56px] max-h-[120px] font-[inherit]"
          />

          <div className="flex items-end justify-between px-4 pb-4 pt-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white text-2xl font-light transition-colors cursor-pointer border-0 shrink-0 disabled:opacity-50"
              aria-label="Dosya ekle"
            >
              +
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={AI_CHAT_ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onAddFile(f);
              }}
            />

            <div className="relative">
              <button
                ref={modelButtonRef}
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                disabled={disabled}
                className="flex items-center gap-1.5 text-white/95 text-[14px] font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent disabled:opacity-50"
              >
                {modelLabel}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[190]"
                    onClick={() => setDropdownOpen(false)}
                    aria-hidden
                  />
                  {dropdownRect &&
                    createPortal(
                      <ul
                        className="fixed z-[200] bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1 min-w-[220px] list-none m-0"
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
