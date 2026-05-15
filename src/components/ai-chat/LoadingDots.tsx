export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2 px-1" aria-label="Yanıt bekleniyor">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[#5B4F4B]/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
