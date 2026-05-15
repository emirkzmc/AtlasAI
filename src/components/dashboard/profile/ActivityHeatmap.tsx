import { useMemo } from "react";

interface ActivityHeatmapProps {
  /** Map of dateKey (YYYY-MM-DD) → login count for that day */
  activityData: Record<string, number>;
  days?: number;
  loading?: boolean;
}

/** 0–4+ giriş sayısına göre renk (4+ en koyu). */
function intensityColor(count: number): string {
  if (count <= 0) return "#EBEDF0";
  if (count === 1) return "#C6E6C3";
  if (count === 2) return "#7BC96F";
  if (count === 3) return "#3B8535";
  return "#1B5E20";
}

/** Format: "15 Mayıs 2026: 3 giriş" */
function formatTooltip(dateKey: string, count: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  const formatted = d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${formatted}: ${count} giriş`;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center flex-1">
      <svg
        className="animate-spin w-5 h-5 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export default function ActivityHeatmap({
  activityData,
  days = 64,
  loading = false,
}: ActivityHeatmapProps) {
  const grid = useMemo(() => {
    const cells: { dateKey: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${day}`;
      const count = activityData[dateKey] ?? 0;
      cells.push({ dateKey, count });
    }
    return cells;
  }, [activityData, days]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col h-full">
      <h3 className="text-[13px] font-semibold text-[#737373] uppercase tracking-wide mb-4">
        Son {days} Gün Aktivite
      </h3>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-wrap gap-[5px]">
            {grid.map(({ dateKey, count }) => (
              <div
                key={dateKey}
                title={formatTooltip(dateKey, count)}
                className="w-[14px] h-[14px] rounded-[3px] transition-colors cursor-default"
                style={{ backgroundColor: intensityColor(count) }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 mt-4">
            <span className="text-[11px] text-[#A3A3A3] mr-1">Az</span>
            {["#EBEDF0", "#C6E6C3", "#7BC96F", "#3B8535", "#1B5E20"].map((color) => (
              <div
                key={color}
                className="w-[12px] h-[12px] rounded-[2px]"
                style={{ backgroundColor: color }}
              />
            ))}
            <span className="text-[11px] text-[#A3A3A3] ml-1">Çok</span>
          </div>
        </>
      )}
    </div>
  );
}
