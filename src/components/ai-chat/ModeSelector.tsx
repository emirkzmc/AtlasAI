import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AiChatMode } from "../../types/quiz.types";

type ModeSelectorProps = {
  value: AiChatMode;
  onChange: (mode: AiChatMode) => void;
  disabled?: boolean;
};

const MODES: { id: AiChatMode; label: string }[] = [
  { id: "lesson", label: "Ders Modu" },
  { id: "test", label: "Test Modu" },
];

export default function ModeSelector({
  value,
  onChange,
  disabled = false,
}: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modeLabel = MODES.find((mode) => mode.id === value)?.label ?? "Ders Modu";

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
        className="flex h-10 min-w-[136px] max-w-[160px] items-center justify-between gap-2 rounded-[12px] border border-white/25 bg-white/18 px-3.5 text-[12px] font-medium text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/25 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{modeLabel}</span>
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
                className="fixed z-200 m-0 min-w-[160px] list-none rounded-[12px] border border-[#E5E5E5] bg-white py-1 shadow-lg"
                style={{
                  left: Math.max(12, Math.min(rect.right - 160, window.innerWidth - 172)),
                  top: Math.min(rect.bottom + 8, window.innerHeight - 128),
                }}
              >
                {MODES.map((mode) => (
                  <li key={mode.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(mode.id);
                        setOpen(false);
                      }}
                      className={`w-full border-0 bg-transparent px-4 py-2.5 text-left text-[14px] hover:bg-[#F3F0EF] cursor-pointer ${
                        mode.id === value
                          ? "font-semibold text-[#5B4F4B]"
                          : "text-[#535353]"
                      }`}
                    >
                      {mode.label}
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
