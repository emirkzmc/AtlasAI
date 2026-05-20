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
    if (live) return;

    let i = 0;
    const step = Math.max(1, Math.floor(text.length / 80));
    let intervalId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      setDisplayed("");
      intervalId = window.setInterval(() => {
      i += step;
      if (i >= text.length) {
        setDisplayed(text);
        if (intervalId) clearInterval(intervalId);
      } else {
        setDisplayed(text.slice(0, i));
      }
      }, 12);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, live]);

  if (live) {
    return (
      <span className={className}>
        {text}
        <span className="inline-block w-[2px] h-[1em] bg-[#5B4F4B]/50 ml-0.5 animate-pulse align-middle" />
      </span>
    );
  }

  return (
    <span className={className}>
      {displayed}
    </span>
  );
}
