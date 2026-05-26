import { useEffect, useRef, type ReactNode } from "react";
import type { AiChatMessage } from "../../types/aiChat.types";
import LoadingDots from "./LoadingDots";
import MarkdownMessage from "./MarkdownMessage";

type AIChatMessageListProps = {
  messages: AiChatMessage[];
  streamingContent: string;
  isSending: boolean;
  userFirstName: string;
  centeredComposer?: ReactNode;
};

export default function AIChatMessageList({
  messages,
  streamingContent,
  isSending,
  userFirstName,
  centeredComposer,
}: AIChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0 && !streamingContent && !isSending;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isSending]);

  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 md:px-10 pb-8">
        <div className="w-full max-w-180 flex flex-col items-stretch gap-5">
          <div className="text-left">
            <div className="flex items-center justify-start gap-2 text-[#1a1a1a] mb-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="16" height="16" x="4" y="4" rx="2" />
                <rect width="6" height="6" x="9" y="9" rx="1" />
                <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
              </svg>
              <span className="text-[32px] font-medium">Merhaba, {userFirstName}</span>
            </div>
            <h2 className="text-[42px] text-[#1a1a1a] tracking-tight m-0">
              Başlayalım mı?
            </h2>
          </div>
          {centeredComposer}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 pt-4 pb-36 space-y-5">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div className={`max-w-[85%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            {msg.attachments?.length ? (
              <div className="mb-1.5 flex flex-wrap justify-end gap-1">
                {msg.attachments.map((a, i) => (
                  <span
                    key={i}
                    className="max-w-45 truncate text-[11px] px-2 py-0.5 rounded-full bg-white text-[#5B4F4B] border border-[#D4C4C4] shadow-sm"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            ) : null}
            <div
              className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#8B6B6B] text-white rounded-br-md"
                  : "bg-white text-[#1a1a1a] shadow-sm border border-[#E8E8E8] rounded-bl-md"
              }`}
            >
              {msg.role === "model" ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        </div>
      ))}

      {isSending && !streamingContent && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 shadow-sm border border-[#E8E8E8] text-[13px] text-[#5B4F4B]">
            <span>Yükleniyor</span>
            <LoadingDots />
          </div>
        </div>
      )}

      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-[15px] bg-white text-[#1a1a1a] shadow-sm border border-[#E8E8E8] leading-relaxed whitespace-pre-wrap">
            <MarkdownMessage content={streamingContent} live />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
