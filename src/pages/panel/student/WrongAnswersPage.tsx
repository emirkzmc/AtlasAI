import { useMemo, useState } from "react";
import { useWrongAnswers } from "../../../hooks/useWrongAnswers";
import type { WrongAnswerItem } from "../../../services/wrongAnswers.service";

function AnswerPill({
  tone,
  label,
}: {
  tone: "wrong" | "correct";
  label: string;
}) {
  const isCorrect = tone === "correct";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium ${
        isCorrect
          ? "border-[#2DBE68] bg-[#EAF8EF] text-[#167A3B]"
          : "border-[#FF6B6B] bg-[#FFECEC] text-[#C93A3A]"
      }`}
    >
      <span className="text-[14px] leading-none">{isCorrect ? "✓" : "×"}</span>
      {label}
    </span>
  );
}

function WrongAnswerCard({ item }: { item: WrongAnswerItem }) {
  return (
    <article className="bg-white rounded-2xl border border-[#D9D9D9] shadow-sm overflow-hidden">
      <div className="border-l-[6px] border-[#FF6B6B] px-5 py-4">
        <div className="mb-3">
          <p className="text-[13px] font-medium text-[#EF5A5A] mb-2">
            {item.category}-{item.documentName}
          </p>
          <p className="text-[14px] text-[#1a1a1a] leading-relaxed">
            {item.question}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <AnswerPill tone="wrong" label={`Senin cevabın: ${item.userAnswer}`} />
          <AnswerPill tone="correct" label={`Doğru cevap: ${item.correctAnswer}`} />
        </div>

        <div className="rounded-xl bg-[#EAF7F1] px-4 py-3 min-h-[88px]">
          <p className="text-[11px] font-semibold text-[#1C8E55] uppercase tracking-wide mb-2">
            Açıklama
          </p>
          <p className="text-[13px] text-[#1a1a1a] leading-relaxed">
            {item.explanation}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function WrongAnswersPage() {
  const { items, categories, loading, error } = useWrongAnswers();
  const [activeCategory, setActiveCategory] = useState("all");

  const visibleItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.documentTitle === activeCategory);
  }, [activeCategory, items]);

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => {
          const active = activeCategory === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`h-9 rounded-full border px-5 text-[13px] font-medium transition-colors cursor-pointer ${
                active
                  ? "border-[#5B4F4B] bg-white text-[#1a1a1a] shadow-sm"
                  : "border-[#CFCFCF] bg-white text-[#1a1a1a] hover:border-[#5B4F4B]"
              }`}
            >
              {category.label} ({category.count})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          Yanlış cevaplar yüklenemedi.
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white py-14 text-center text-[14px] text-[#999]">
          Yanlış cevaplar yükleniyor...
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white py-14 text-center text-[14px] text-[#999]">
          Henüz yanlış cevap kaydı yok
        </div>
      ) : (
        <div className="space-y-5">
          {visibleItems.map((item) => (
            <WrongAnswerCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
