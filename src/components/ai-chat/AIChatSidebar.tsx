import type { AiChatSummary } from "../../types/aiChat.types";

type AIChatSidebarProps = {
  chats: AiChatSummary[];
  activeChatId: string | null;
  isLoading: boolean;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
};

export default function AIChatSidebar({
  chats,
  activeChatId,
  isLoading,
  onNewChat,
  onSelectChat,
}: AIChatSidebarProps) {
  return (
    <aside className="w-[240px] shrink-0 flex flex-col bg-[#B89595] text-white h-full">
      <div className="p-5 pt-6 flex flex-col gap-5 min-h-0 flex-1">
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent p-0"
          aria-label="Menü"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-2.5 text-[15px] font-medium hover:bg-white/10 rounded-lg px-2 py-2 -mx-2 transition-colors cursor-pointer border-0 bg-transparent text-left w-full"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Yeni sohbet
        </button>

        <div className="flex flex-col min-h-0 flex-1">
          <p className="text-[13px] font-semibold text-white/90 mb-3 px-1">Sohbetler</p>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 pr-1">
            {isLoading && (
              <p className="text-[13px] text-white/70 px-2">Yükleniyor…</p>
            )}
            {!isLoading && chats.length === 0 && (
              <p className="text-[13px] text-white/70 px-2">Henüz sohbet yok</p>
            )}
            {chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left px-2 py-2.5 rounded-lg text-[14px] transition-colors cursor-pointer border-0 truncate whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeChatId === chat.id
                    ? "bg-white/20 font-medium"
                    : "bg-transparent hover:bg-white/10 font-normal text-white/95"
                }`}
                title={chat.title}
              >
                {chat.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
