import type { MentorInsight } from "../../types/mentorship.types";

interface MentorInsightPanelProps {
  insight: MentorInsight | null;
  loading: boolean;
}

export default function MentorInsightPanel({ insight, loading }: MentorInsightPanelProps) {
  return (
    <section className="relative min-h-[92px] w-full overflow-hidden rounded-[8px] border border-[#ECE9E7] bg-white px-5 py-5 shadow-sm">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-amber-50 to-transparent opacity-50 pointer-events-none" />
      
      <div className="relative flex h-full items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100/50">
          <img
            src="/icons/brain-icon.svg"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 object-contain"
          />
        </div>
        
        <div className="min-h-[52px] flex-1">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-3 w-1/3 rounded bg-gray-200" />
            </div>
          ) : insight ? (
            <>
              <p className="text-base font-medium text-gray-900 mb-1">
                {insight.overallMessage}
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600">
                {insight.strongestArea && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    En güçlü: <span className="font-medium text-gray-800">{insight.strongestArea}</span>
                  </div>
                )}
                {insight.weakestArea && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Geliştirilmeli: <span className="font-medium text-gray-800">{insight.weakestArea}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Başarı: <span className="font-medium text-gray-800">%{insight.overallSuccessRate}</span>
                </div>
              </div>
            </>
          ) : (
             <p className="text-sm text-gray-500 italic">Analiz sonucu bekleniyor...</p>
          )}
        </div>
      </div>
    </section>
  );
}
