export default function MentorInsightPanel() {
  return (
    <section className="min-h-[92px] w-full rounded-[8px] border border-[#ECE9E7] bg-white px-5 py-5 shadow-sm">
      <div className="flex h-full items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
          <img
            src="/icons/brain-icon.svg"
            alt=""
            aria-hidden="true"
            className="h-11 w-11 object-contain"
          />
        </div>
        <div className="min-h-[52px] flex-1" />
      </div>
    </section>
  );
}
