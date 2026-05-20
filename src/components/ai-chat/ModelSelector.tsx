import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GEMINI_MODELS } from "../../constants/aiChat.constants";
import type { GeminiModelId } from "../../types/aiChat.types";

type ModelSelectorProps = {
  value: GeminiModelId;
  onChange: (model: GeminiModelId) => void;
  disabled?: boolean;
};

export default function ModelSelector({
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modelLabel = GEMINI_MODELS.find((model) => model.id === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      setRect(buttonRef.current?.getBoundingClientRect() ?? null);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className="flex h-10 min-w-[180px] max-w-[220px] items-center justify-between gap-2 rounded-[12px] border border-white/25 bg-white/18 px-3.5 text-[12px] font-medium text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/25 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{modelLabel}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className="shrink-0"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-190" onClick={() => setOpen(false)} aria-hidden />
          {rect &&
            createPortal(
              <ul
                className="fixed z-200 m-0 min-w-[220px] list-none rounded-[12px] border border-[#E5E5E5] bg-white py-1 shadow-lg"
                style={{
                  left: Math.max(12, Math.min(rect.right - 220, window.innerWidth - 232)),
                  top: Math.min(rect.bottom + 8, window.innerHeight - 210),
                }}
              >
                {GEMINI_MODELS.map((model) => (
                  <li key={model.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(model.id);
                        setOpen(false);
                      }}
                      className={`w-full border-0 bg-transparent px-4 py-2.5 text-left text-[14px] hover:bg-[#F3F0EF] cursor-pointer ${
                        model.id === value
                          ? "font-semibold text-[#5B4F4B]"
                          : "text-[#535353]"
                      }`}
                    >
                      {model.label}
                    </button>
                  </li>
                ))}
              </ul>,
              document.body
            )}
        </>
      )}
    </div>
  );
}
