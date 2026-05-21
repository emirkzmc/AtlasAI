import MentorInsightPanel from "../../../components/mentorship/MentorInsightPanel";
import MentorPrioritySection from "../../../components/mentorship/MentorPrioritySection";
import { useMentorshipAnalysis } from "../../../hooks/useMentorshipAnalysis";

export default function MentorshipPage() {
  const { result, status, error, refresh } = useMentorshipAnalysis();
  
  const loading = status === "loading";

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-[26px] font-bold text-gray-900">AI Mentor Analizi</h2>
           <p className="text-sm text-gray-500 mt-1">Quiz performansın yapay zeka tarafından analiz ediliyor.</p>
        </div>
        <button 
           onClick={() => refresh(true)}
           disabled={loading}
           className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
           {loading ? (
             <>
               <svg className="mr-2 h-4 w-4 animate-spin text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Analiz Ediliyor...
             </>
           ) : (
             <>
               <svg className="mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
               </svg>
               Yeniden Analiz Et
             </>
           )}
        </button>
      </div>

      <MentorInsightPanel 
         insight={result?.insight ?? null} 
         loading={loading} 
      />
      <MentorPrioritySection 
         cards={result?.cards ?? []} 
         loading={loading} 
         error={error}
         onRetry={() => refresh(true)}
      />
    </div>
  );
}
