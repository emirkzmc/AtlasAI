import { useNavigate } from "react-router-dom";
import type { DocumentStat } from "../../services/dashboard.service";

const BAR_COLORS = ["#4CAF50", "#5B8DEF", "#8BC34A", "#F59E0B"];

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <svg
        className="animate-spin w-6 h-6 text-gray-300"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  color: string;
}

function ProgressBar({ value, color }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[13px] font-semibold w-9 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

interface DocumentSuccessDistributionProps {
  documents: DocumentStat[];
  loading?: boolean;
}

export default function DocumentSuccessDistribution({
  documents,
  loading = false,
}: DocumentSuccessDistributionProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
        Döküman Başarı Dağılımı
      </span>

      {loading ? (
        <Spinner />
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
          <svg
            className="w-12 h-12 text-gray-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <p className="text-[14px] text-gray-500 max-w-[220px]">
            Yüklenmiş döküman bulunmamakta. Hemen bir döküman yükleyin.
          </p>
          <button
            onClick={() => navigate("/panel/student/dokumanlarim")}
            className="px-5 py-2 bg-[#5B4F4B] text-white text-[13px] font-semibold rounded-xl hover:bg-[#3a2a2a] transition-colors cursor-pointer"
          >
            Döküman Yükle
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {documents.map((doc, index) => (
            <div key={doc.id} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span
                  className="text-[14px] font-medium text-gray-700 truncate max-w-[200px]"
                  title={doc.name}
                >
                  {doc.name}
                </span>
                {doc.answeredQuestions === 0 && (
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                    Henüz çözülmedi
                  </span>
                )}
              </div>
              <ProgressBar
                value={doc.answeredQuestions === 0 ? 0 : doc.successRate}
                color={BAR_COLORS[index % BAR_COLORS.length]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
