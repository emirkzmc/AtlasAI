import { useEffect, useState } from "react";

type TypewriterTextProps = {
  text: string;
  /** Canlı akış sırasında doğrudan göster */
  live?: boolean;
  className?: string;
};

export default function TypewriterText({ text, live = false, className = "" }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (live) {
      setDisplayed(text);
      return;
    }
    setDisplayed("");
    let i = 0;
    const step = Math.max(1, Math.floor(text.length / 80));
    const id = window.setInterval(() => {
      i += step;
      if (i >= text.length) {
        setDisplayed(text);
        clearInterval(id);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, 12);
    return () => clearInterval(id);
  }, [text, live]);

  return (
    <span className={className}>
      {displayed}
      {live && (
        <span className="inline-block w-[2px] h-[1em] bg-[#5B4F4B]/50 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}
