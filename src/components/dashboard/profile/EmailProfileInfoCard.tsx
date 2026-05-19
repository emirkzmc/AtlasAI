interface EmailProfileInfoCardProps {
  label: string;
  value: string;
  onEditClick: () => void;
}

/**
 * E-posta bilgi kartı — kalem ikonuna tıklanınca değiştirme modalını açar.
 * Satır içi düzenleme yerine modal ile çalışır (doğrulama akışı gerektiği için).
 */
export default function EmailProfileInfoCard({
  label,
  value,
  onEditClick,
}: EmailProfileInfoCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col justify-center relative group">
      <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-2">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-[16px] text-[#1a1a1a] flex-1 truncate">{value}</span>
        <button
          type="button"
          onClick={onEditClick}
          className="w-8 h-8 flex items-center justify-center rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[#f0f0f0] transition-all duration-200 cursor-pointer shrink-0"
          aria-label={`${label} değiştir`}
        >
          <img
            src="/icons/pen-icon.svg"
            alt="Değiştir"
            className="w-4 h-4"
          />
        </button>
      </div>
    </div>
  );
}
