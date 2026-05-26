import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AiChatSummary } from "../../types/aiChat.types";

type AIChatSidebarProps = {
  chats: AiChatSummary[];
  activeChatId: string | null;
  isLoading: boolean;
  deletingChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
};

export default function AIChatSidebar({
  chats,
  activeChatId,
  isLoading,
  deletingChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: AIChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleDeleteChat(chat: AiChatSummary) {
    const ok = window.confirm(`"${chat.title}" sohbeti silinsin mi?`);
    if (ok) onDeleteChat(chat.id);
  }

  function formatChatDate(date: Date): string {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? (isMobile ? 52 : 62) : 240 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`shrink-0 flex flex-col bg-[#B89E9E] text-white py-2 h-full overflow-hidden ${
        isMobile && !isCollapsed ? "absolute left-0 top-0 bottom-0 z-50 shadow-2xl rounded-l-[28px]" : "relative"
      }`}
    >
      <div className="pt-1.5 flex flex-col gap-2.5 min-h-0 flex-1 px-3">
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          className=" w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent p-0 text-white shrink-0"
          aria-label={isCollapsed ? "Menüyü aç" : "Menüyü kapat"}
          aria-expanded={!isCollapsed}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className={`flex items-center gap-2 text-[15px] font-medium hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent text-white ${
            isCollapsed
              ? "pl-2 items-center w-9 h-9 justify-center rounded-full p-0"
              : "w-full rounded-lg py-2 px-1.5"
          }`}
          aria-label="Yeni sohbet"
          title={isCollapsed ? "Yeni sohbet" : undefined}
        >
          <img
            src="/icons/edit-icon.svg"
            alt=""
            aria-hidden
            className="shrink-0 w-[22px] h-[22px] brightness-0 invert"
          />
          <motion.span
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap overflow-hidden text-left"
            style={{
              maxWidth: isCollapsed ? 0 : 180,
              visibility: isCollapsed ? "hidden" : "visible",
            }}
          >
            Yeni sohbet
          </motion.span>
        </button>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              key="sidebar-content"
              className="flex flex-col min-h-0 flex-1 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-[13px] font-semibold text-white/90 mb-3 px-1">
                Sohbetler
              </p>
              <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 pr-1">
                {isLoading && (
                  <p className="text-[13px] text-white/70 px-2">Yükleniyor...</p>
                )}
                {!isLoading && chats.length === 0 && (
                  <p className="text-[13px] text-white/70 px-2">
                    Henüz sohbet yok
                  </p>
                )}
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-1 rounded-lg transition-colors ${activeChatId === chat.id
                      ? "bg-white/20"
                      : "bg-transparent hover:bg-white/10"
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={`min-w-0 flex-1 text-left px-2 py-2.5 rounded-lg transition-colors cursor-pointer border-0 overflow-hidden bg-transparent ${activeChatId === chat.id
                        ? "font-medium text-white"
                        : "font-normal text-white/95"
                        }`}
                      title={chat.title}
                    >
                      <span className="block truncate whitespace-nowrap text-[14px]">
                        {chat.title}
                      </span>
                      <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-normal text-white/70">
                        {chat.mode === "test" && (
                          <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5">
                            {chat.quizStatus === "completed" ? "Tamamlandı" : "Devam"}
                          </span>
                        )}
                        <span className="truncate">
                          {chat.documentTitle ?? chat.prompt ?? formatChatDate(chat.updatedAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChat(chat)}
                      disabled={deletingChatId === chat.id}
                      className="w-8 h-8 mr-1 shrink-0 flex items-center justify-center rounded-md border-0 bg-transparent text-white/70 opacity-0 group-hover:opacity-100 hover:bg-white/15 hover:text-white focus:opacity-100 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      aria-label={`${chat.title} sohbetini sil`}
                      title="Sohbeti sil"
                    >
                      {deletingChatId === chat.id ? (
                        <span className="text-[11px] leading-none">...</span>
                      ) : (
                        <span
                          className="text-[20px] leading-none font-light"
                          aria-hidden
                        >
                          &times;
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Mobile overlay for when menu is open */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/10 z-[-1]"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </motion.aside>
  );
}
