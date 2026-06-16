import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { usePerformanceData } from "../../../hooks/usePerformanceData";

ChartJS.register(ArcElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip);

function getDisplayValue(value: number | null): string {
  return value === null ? "--" : String(value);
}

function PerformanceStatCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm px-6 py-5 min-h-[112px] flex flex-col justify-between"
      style={{ borderBottom: `3px solid ${accentColor}` }}
    >
      <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[32px] font-semibold text-[#1a1a1a] leading-none">
        {value}
      </span>
    </div>
  );
}

export default function PerformancePage() {
  const { data, loading, error } = usePerformanceData();
  const { summary, dailyTrend, documents } = data;
  const correct = summary.correct ?? 0;
  const wrong = summary.wrong ?? 0;
  const blank = summary.blank ?? 0;
  const answeredTotal = correct + wrong + blank;
  const hasDistributionData = answeredTotal > 0;
  const hasDailyTrend = dailyTrend.some((item) => item.totalQuestionsAnswered > 0);

  const distributionData = {
    labels: ["Başarılı", "Hatalı", "Es Geçilen"],
    datasets: [
      {
        data: hasDistributionData ? [correct, wrong, blank] : [1],
        backgroundColor: hasDistributionData
          ? ["#1F9D49", "#EF5A5A", "#C2A48F"]
          : ["#E5E5E5"],
        borderWidth: 0,
        hoverOffset: hasDistributionData ? 4 : 0,
      },
    ],
  };

  const distributionOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "58%",
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: hasDistributionData,
        backgroundColor: "#1a1a1a",
        titleColor: "#fff",
        bodyColor: "#e5e5e5",
        cornerRadius: 8,
        padding: 10,
      },
    },
  };

  const dailyTrendData = {
    labels: dailyTrend.map((item) => item.dayLabel),
    datasets: [
      {
        data: dailyTrend.map((item) => item.value),
        borderColor: "#1F4D26",
        backgroundColor: "rgba(31, 157, 73, 0.08)",
        pointBackgroundColor: "#1F4D26",
        pointBorderColor: "#1F4D26",
        pointRadius: 4,
        pointHoverRadius: 5,
        borderWidth: 1.5,
        tension: 0,
        fill: true,
      },
    ],
  };

  const dailyTrendOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const item = dailyTrend[ctx.dataIndex];
            const correctCount = item?.totalCorrectAnswers ?? 0;
            const totalCount = item?.totalQuestionsAnswered ?? 0;
            return ` Başarı: ${ctx.parsed.y}% (${correctCount}/${totalCount})`;
          },
        },
        backgroundColor: "#1a1a1a",
        titleColor: "#fff",
        bodyColor: "#e5e5e5",
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: "#D8D8D8" },
        ticks: {
          font: { family: "Poppins, sans-serif", size: 12 },
          color: "#1a1a1a",
        },
      },
      y: {
        min: 0,
        max: 100,
        border: { color: "#D8D8D8" },
        grid: { color: "#E5E5E5" },
        ticks: {
          stepSize: 20,
          font: { family: "Poppins, sans-serif", size: 12 },
          color: "#1a1a1a",
        },
      },
    },
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <PerformanceStatCard
          label="Toplam Problem"
          value={loading ? "" : getDisplayValue(summary.total)}
          accentColor="#5B4F4B"
        />
        <PerformanceStatCard
          label="Başarılı"
          value={loading ? "" : getDisplayValue(summary.correct)}
          accentColor="#1F9D49"
        />
        <PerformanceStatCard
          label="Hatalı"
          value={loading ? "" : getDisplayValue(summary.wrong)}
          accentColor="#EF5A5A"
        />
        <PerformanceStatCard
          label="Es Geçilen"
          value={loading ? "" : getDisplayValue(summary.blank)}
          accentColor="#C2A48F"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          Performans verileri yüklenemedi.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-6">
        <section className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-6 min-h-[320px]">
          <h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-5">
            Başarılı / Hatalı / Es Geçilen Dağılımı
          </h3>
          <div className="h-[190px]">
            <Doughnut data={distributionData} options={distributionOptions} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: "Başarılı", value: summary.correct, color: "#1F9D49" },
              { label: "Hatalı", value: summary.wrong, color: "#EF5A5A" },
              { label: "Es Geçilen", value: summary.blank, color: "#C2A48F" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[13px] text-[#535353] truncate">
                  {item.label}: {getDisplayValue(item.value)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-6 min-h-[320px] flex flex-col">
          <h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-5">
            Günlük Başarı Trendi
          </h3>
          {loading ? (
            <div className="h-[245px] flex items-center justify-center text-[14px] text-[#999]">
              Yükleniyor...
            </div>
          ) : hasDailyTrend ? (
            <div className="h-[245px]">
              <Line data={dailyTrendData} options={dailyTrendOptions} />
            </div>
          ) : (
            <div className="h-[245px] flex items-center justify-center text-[14px] text-[#999]">
              Henüz günlük başarı verisi yok
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-6">
        <h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-5">
          Teknik Doküman Analiz Performansı
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide py-3 px-3">
                  Kaynak/Doküman
                </th>
                <th className="text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide py-3 px-3">
                  Problem Sayısı
                </th>
                <th className="text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide py-3 px-3">
                  Başarılı Çözüm
                </th>
                <th className="text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide py-3 px-3">
                  Başarı Oranı
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-[14px] text-[#999] py-12"
                  >
                    Henüz performans verisi yok
                  </td>
                </tr>
              ) : (
                documents.map((row) => (
                  <tr key={row.id} className="border-b border-[#EEEEEE] last:border-b-0">
                    <td className="py-4 px-3 text-[14px] text-[#1a1a1a]">
                      {row.documentName}
                    </td>
                    <td className="py-4 px-3 text-[14px] text-[#1a1a1a]">
                      {row.questionCount}
                    </td>
                    <td className="py-4 px-3 text-[14px] text-[#1a1a1a]">
                      {row.correctCount}
                    </td>
                    <td className="py-4 px-3">
                      <span className="inline-flex items-center justify-center min-w-[64px] rounded-full bg-[#1F9D49] px-3 py-1 text-[12px] font-semibold text-white">
                        %{row.successRate}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
