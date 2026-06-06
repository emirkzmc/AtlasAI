import type { QuizResult } from "../../types/quiz.types";

type QuizResultSummaryProps = {
  result: QuizResult;
};

export default function QuizResultSummary({ result }: QuizResultSummaryProps) {
  const items = [
    { label: "Toplam", value: result.totalQuestions, color: "#5B4F4B" },
    { label: "Doğru", value: result.correctCount, color: "#1F9D49" },
    { label: "Yanlış", value: result.wrongCount, color: "#EF5A5A" },
    { label: "Boş", value: result.blankCount, color: "#C2A48F" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-sm"
          style={{ borderBottom: `3px solid ${item.color}` }}
        >
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#737373]">
            {item.label}
          </p>
          <p className="m-0 mt-2 text-[28px] font-semibold leading-none text-[#1a1a1a]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
