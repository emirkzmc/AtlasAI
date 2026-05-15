function Spinner() {
  return (
    <svg
      className="animate-spin w-5 h-5 text-gray-300"
      xmlns="http://www.w3.org/2000/svg"
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
  );
}

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  subtitleColor?: string;
  accentColor?: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  unit,
  subtitle,
  subtitleColor = "#9CA3AF",
  accentColor = "#5B4F4B",
  loading = false,
}: StatCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden"
      style={{ borderBottom: `3px solid ${accentColor}` }}
    >
      <div className="px-6 pt-5 pb-5 flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          {title}
        </span>

        {loading ? (
          <div className="flex items-center h-10 mt-2">
            <Spinner />
          </div>
        ) : (
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[38px] font-bold text-gray-900 leading-none">
              {value}
            </span>
            {unit && (
              <span className="text-[13px] font-semibold text-gray-400 ml-1">
                {unit}
              </span>
            )}
          </div>
        )}

        {!loading && subtitle && (
          <span
            className="text-[12px] font-medium mt-1"
            style={{ color: subtitleColor }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
