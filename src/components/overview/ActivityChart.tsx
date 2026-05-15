import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { ActivityDay } from "../../services/dashboard.service";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function Spinner() {
  return (
    <div className="flex items-center justify-center h-[220px]">
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

interface ActivityChartProps {
  days: ActivityDay[];
  loading?: boolean;
}

export default function ActivityChart({ days, loading = false }: ActivityChartProps) {
  const maxCount = Math.max(...days.map((d) => d.activeCount), 0);
  // Y ekseni: minimum görüntüleme aralığı 5, üstünde veri varsa otomatik ölçeklenir
  const yMax = Math.max(maxCount + 1, 5);

  const chartData = {
    labels: days.map((d) => d.label),
    datasets: [
      {
        data: days.map((d) => d.activeCount),
        backgroundColor: "#5B4F4B",
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 28,
        hoverBackgroundColor: "#3a2a2a",
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y} giriş`,
        },
        backgroundColor: "#1a1a1a",
        titleColor: "#fff",
        bodyColor: "#d1d5db",
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { family: "Poppins, sans-serif", size: 12 },
          color: "#9CA3AF",
        },
      },
      y: {
        beginAtZero: true,
        max: yMax,
        border: { display: false },
        grid: { color: "#F3F4F6" },
        ticks: {
          stepSize: 1,
          font: { family: "Poppins, sans-serif", size: 11 },
          color: "#9CA3AF",
          // Only show integer ticks
          callback: (value) => (Number.isInteger(value) ? value : null),
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
        Son 7 Gün Giriş Aktivitesi
      </span>

      {loading ? (
        <Spinner />
      ) : (
        <div className="h-[220px]">
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}
