import { useMemo } from "react";

interface ActivityHeatmapProps {
  activityLog: string[]; // array of 'YYYY-MM-DD'
  days?: number;
}

export default function ActivityHeatmap({ activityLog, days = 64 }: ActivityHeatmapProps) {
  const grid = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate last `days` days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const isActive = activityLog.includes(dateStr);
      dates.push({ date: dateStr, isActive });
    }
    return dates;
  }, [activityLog, days]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] h-full">
      <h3 className="text-[13px] font-semibold text-[#737373] uppercase tracking-wide mb-4">
        SON {days} GÜN AKTİVİTE
      </h3>
      {/* 
        To mimic the github look with columns/rows, we can use CSS grid 
        or just flex wrap. Let's use a nice CSS grid for horizontal flow 
        if we want, but simple flex wrap is easier if we don't have exactly 7 rows.
      */}
      <div className="flex flex-wrap gap-1.5">
        {grid.map((day) => (
          <div
            key={day.date}
            title={day.date}
            className={`w-[16px] h-[16px] rounded-[3px] transition-colors ${
              day.isActive ? "bg-[#3B8535]" : "bg-[#D9D9D9]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
