import MentorPriorityCard from "./MentorPriorityCard";
import MentorCardSkeleton from "./MentorCardSkeleton";
import MentorEmptyState from "./MentorEmptyState";
import type { MentorCard } from "../../types/mentorship.types";

interface MentorPrioritySectionProps {
  cards: MentorCard[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const EMPTY_CARD_COUNT = 3;

export default function MentorPrioritySection({ cards, loading, error, onRetry }: MentorPrioritySectionProps) {
  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-10 px-4 text-center">
         <p className="text-sm text-red-700 mb-4">{error}</p>
         <button onClick={onRetry} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
           Tekrar Dene
         </button>
      </div>
    );
  }

  if (!loading && cards.length === 0) {
    return <MentorEmptyState />;
  }

  return (
    <section className="mt-6">
      <h2 className="mb-4 text-[13px] font-medium uppercase tracking-0 text-[#6E6E6E]">
        ÖNCELİKLİ ÇALIŞMA ALANLARI
      </h2>
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: EMPTY_CARD_COUNT }, (_, index) => (
            <MentorCardSkeleton key={index} />
          ))
        ) : (
          cards.map((card, index) => (
            <MentorPriorityCard key={card.title + index} card={card} index={index} />
          ))
        )}
      </div>
    </section>
  );
}
