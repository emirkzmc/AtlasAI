import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAiChat } from "../../hooks/useAiChat";
import { getUserDisplayName } from "../../utils/userDisplay";
import AIChatSidebar from "./AIChatSidebar";
import AIChatMessageList from "./AIChatMessageList";
import AIChatInput from "./AIChatInput";

type AIChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AIChatModal({ isOpen, onClose }: AIChatModalProps) {
  const { user, loading } = useAuth();
  const chat = useAiChat(isOpen);

  const displayName = getUserDisplayName(user);
  const firstName =
    user?.firstName?.trim() ||
    displayName.split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "Kullanıcı";
  const isEmptyChat =
    chat.messages.length === 0 && !chat.streamingContent && !chat.isSending;

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6 md:p-8"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Yapay zeka sohbet"
    >
      <div
        className="w-[min(96vw,1400px)] h-[min(92vh,860px)] max-h-[92vh] flex rounded-[28px] overflow-hidden shadow-2xl font-['Poppins',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        <AIChatSidebar
          chats={chat.chats}
          activeChatId={chat.activeChatId}
          isLoading={chat.isLoadingChats}
          deletingChatId={chat.deletingChatId}
          onNewChat={chat.startNewChat}
          onSelectChat={chat.selectChat}
          onDeleteChat={chat.deleteChat}
        />

        <main className="flex-1 flex flex-col bg-[#E8E8E8] relative min-w-0 min-h-0">
          <div className="flex items-center justify-between px-6 md:px-10 pt-6 pb-2 shrink-0">
            <span className="text-[28px]  text-[#1a1a1a] tracking-wide">AtlasAI</span>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 text-[#5B4F4B] transition-colors cursor-pointer border-0 bg-transparent text-xl leading-none"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>

          {chat.error && (
            <div className="mx-6 md:mx-10 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
              {chat.error}
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-[#737373] text-[14px]">
              Oturum kontrol ediliyor...
            </div>
          ) : chat.isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center text-[#737373] text-[14px]">
              Mesajlar yükleniyor…
            </div>
          ) : (
            <AIChatMessageList
              messages={chat.messages}
              streamingContent={chat.streamingContent}
              isSending={chat.isSending}
              userFirstName={firstName}
              centeredComposer={
                isEmptyChat ? (
                  <AIChatInput
                    selectedModel={chat.selectedModel}
                    onModelChange={chat.setSelectedModel}
                    onSend={chat.sendMessage}
                    onAddDocument={chat.addDocumentAttachment}
                    availableDocuments={chat.availableDocuments}
                    isLoadingDocuments={chat.isLoadingDocuments}
                    attachments={chat.pendingAttachments}
                    onRemoveAttachment={chat.removeAttachment}
                    disabled={chat.isSending}
                    placement="inline"
                  />
                ) : null
              }
            />
          )}

          {!isEmptyChat && (
            <AIChatInput
              selectedModel={chat.selectedModel}
              onModelChange={chat.setSelectedModel}
              onSend={chat.sendMessage}
              onAddDocument={chat.addDocumentAttachment}
              availableDocuments={chat.availableDocuments}
              isLoadingDocuments={chat.isLoadingDocuments}
              attachments={chat.pendingAttachments}
              onRemoveAttachment={chat.removeAttachment}
              disabled={chat.isSending}
            />
          )}
        </main>
      </div>
    </div>,
    document.body
  );
}
