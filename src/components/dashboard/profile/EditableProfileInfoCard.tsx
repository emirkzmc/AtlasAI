import { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface EditableProfileInfoCardProps {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<boolean>;
  saving?: boolean;
  error?: string;
}

/**
 * Profil bilgi kartı — kalem ikonuna tıklanınca satır içi düzenleme açılır.
 * Yalnızca Ad Soyad gibi doğrudan düzenlenebilir alanlar için kullanılır.
 */
export default function EditableProfileInfoCard({
  label,
  value,
  onSave,
  saving = false,
  error = "",
}: EditableProfileInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dışarıdan gelen value değişince draft'ı güncelle
  useEffect(() => {
    if (editing) return;
    const timeoutId = window.setTimeout(() => {
      setDraft(value);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [value, editing]);

  // Düzenleme moduna geçince inputa odaklan
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing(): void {
    setDraft(value);
    setEditing(true);
  }

  async function confirmEdit(): Promise<void> {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      return;
    }
    const success = await onSave(trimmed);
    if (success) setEditing(false);
  }

  function cancelEdit(): void {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col justify-center relative group">
      <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-2">
        {label}
      </span>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={confirmEdit}
            disabled={saving}
            className="flex-1 text-[16px] text-[#1a1a1a] border-b-2 border-[#5B4F4B] bg-transparent outline-none py-1 transition-colors disabled:opacity-60"
            aria-label={`${label} düzenle`}
          />
          {saving && (
            <svg
              className="animate-spin w-4 h-4 text-[#5B4F4B] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-[16px] text-[#1a1a1a] flex-1">{value}</span>
          <button
            type="button"
            onClick={startEditing}
            className="w-8 h-8 flex items-center justify-center rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[#f0f0f0] transition-all duration-200 cursor-pointer shrink-0"
            aria-label={`${label} düzenle`}
          >
            <img
              src="/icons/pen-icon.svg"
              alt="Düzenle"
              className="w-4 h-4"
            />
          </button>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-red-500 mt-2 m-0">{error}</p>
      )}
    </div>
  );
}
