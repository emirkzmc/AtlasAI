import { useCallback, useEffect } from "react";
import { useScrollLock } from "../../hooks/useScrollLock";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAiChat } from "../../hooks/useAiChat";
import { getUserDisplayName } from "../../utils/userDisplay";
import AIChatSidebar from "./AIChatSidebar";
import AIChatMessageList from "./AIChatMessageList";
import AIChatInput from "./AIChatInput";
import QuizWorkspace from "./QuizWorkspace";

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

  const handleOpenQuiz = useCallback((messageId: string) => {
    chat.openQuiz(messageId);
  }, [chat]);

  const shouldShowQuizWorkspace =
    chat.chatMode === "test" &&
    (chat.isSending ||
      chat.activeQuiz !== null ||
      chat.quizResult !== null ||
      chat.activeQuizContext !== null);
  const shouldShowMessageList = !shouldShowQuizWorkspace;
  const isEmptyChat =
    chat.messages.length === 0 &&
    !chat.streamingContent &&
    !chat.isSending;
  const inputPlaceholder =
    chat.chatMode === "test"
      ? "Test hazırlamak istediğiniz konuyu yazın"
      : "Yazılım problemi sorun, kod ekleyin veya doküman yükleyin";

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const composer = (
    <AIChatInput
      selectedModel={chat.selectedModel}
      onModelChange={chat.setSelectedModel}
      chatMode={chat.chatMode}
      onModeChange={chat.setChatMode}
      onSend={chat.sendMessage}
      onAddDocument={chat.addDocumentAttachment}
      availableDocuments={chat.availableDocuments}
      isLoadingDocuments={chat.isLoadingDocuments}
      attachments={chat.pendingAttachments}
      onRemoveAttachment={chat.removeAttachment}
      disabled={chat.isSending}
      placement="inline"
      placeholder={inputPlaceholder}
      modeLocked={chat.isChatModeLocked}
    />
  );

  return createPortal(
    <div
      className="atlasai-ai-modal fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6 md:p-8"
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
          <div className="flex flex-col gap-3 px-6 md:px-10 pt-6 pb-2 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[28px] text-[#1a1a1a] tracking-wide">
                AtlasAI
              </span>
              <div className="flex min-w-0 items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 text-[#5B4F4B] transition-colors cursor-pointer border-0 bg-transparent text-xl leading-none"
                  aria-label="Kapat"
                >
                  ×
                </button>
              </div>
            </div>
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
              Mesajlar yükleniyor...
            </div>
          ) : shouldShowMessageList ? (
            <AIChatMessageList
              messages={chat.messages}
              streamingContent={chat.streamingContent}
              isSending={chat.isSending}
              userFirstName={firstName}
              centeredComposer={isEmptyChat ? composer : null}
              onOpenQuiz={handleOpenQuiz}
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 pt-4 pb-6">
              <QuizWorkspace
                key={`${chat.activeQuiz?.sourceType ?? "pending"}-${chat.activeQuiz?.documentId ?? chat.activeQuizContext?.documentId ?? "general"}-${chat.activeQuiz?.title ?? chat.lastTestPrompt}`}
                quiz={chat.activeQuiz}
                context={chat.activeQuizContext}
                composer={composer}
                messages={chat.messages}
                streamingContent={chat.streamingContent}
                isLoading={chat.isSending}
                error={chat.error}
                currentQuestionIndex={chat.currentQuestionIndex}
                answers={chat.quizAnswers}
                result={chat.quizResult}
                isSaving={chat.isSavingQuizResult}
                onQuestionChange={chat.setCurrentQuestionIndex}
                onAnswer={chat.answerQuizQuestion}
                onFinish={chat.finishQuiz}
                onAskAI={chat.askQuizQuestion}
                saveStatus={chat.quizSaveStatus}
                saveError={chat.quizSaveError}
                onOpenQuiz={handleOpenQuiz}
              />
            </div>
          )}

          {shouldShowMessageList && !isEmptyChat && (
            <AIChatInput
              selectedModel={chat.selectedModel}
              onModelChange={chat.setSelectedModel}
              chatMode={chat.chatMode}
              onModeChange={chat.setChatMode}
              onSend={chat.sendMessage}
              onAddDocument={chat.addDocumentAttachment}
              availableDocuments={chat.availableDocuments}
              isLoadingDocuments={chat.isLoadingDocuments}
              attachments={chat.pendingAttachments}
              onRemoveAttachment={chat.removeAttachment}
              disabled={chat.isSending}
              placeholder={inputPlaceholder}
              modeLocked={chat.isChatModeLocked}
            />
          )}
        </main>
      </div>
    </div>,
    document.body
  );
}
