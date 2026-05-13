    import MentorPriorityCard from "./MentorPriorityCard";

const EMPTY_CARD_COUNT = 4;

export default function MentorPrioritySection() {
  return (
    <section className="mt-6">
      <h2 className="mb-4 text-[13px] font-medium uppercase tracking-0 text-[#6E6E6E]">
        ÖNCELİKLİ ÇALIŞMA ALANLARI
      </h2>
      <div className="space-y-4">
        {Array.from({ length: EMPTY_CARD_COUNT }, (_, index) => (
          <MentorPriorityCard key={index} />
        ))}
      </div>
    </section>
  );
}
