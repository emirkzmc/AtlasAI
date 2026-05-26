import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { AiChatMessage } from "../../types/aiChat.types";
import type {
  QuizContextInfo,
  QuizPayload,
  QuizResult,
  QuizSaveStatus,
} from "../../types/quiz.types";
import type { QuizSelectionMap } from "../../services/quiz/quizStats";
import LoadingDots from "./LoadingDots";
import MarkdownMessage from "./MarkdownMessage";
import QuizPanel from "./QuizPanel";

type QuizWorkspaceProps = {
  quiz: QuizPayload | null;
  context: QuizContextInfo | null;
  composer: ReactNode;
  messages: AiChatMessage[];
  streamingContent: string;
  isLoading: boolean;
  error: string | null;
  currentQuestionIndex: number;
  answers: QuizSelectionMap;
  result: QuizResult | null;
  isSaving: boolean;
  onQuestionChange: (index: number) => void;
  onAnswer: (questionId: string, selectedOptionId: string) => void;
  onFinish: () => void;
  onAskAI: (prompt: string) => void;
  saveStatus: QuizSaveStatus;
  saveError: string | null;
};

function getDocumentType(context: QuizContextInfo | null): string {
  if (!context?.documentTitle) return "GENEL";
  const extension = context.documentTitle.split(".").pop();
  if (extension && extension !== context.documentTitle) return extension.toUpperCase();
  return context.documentType?.split("/").pop()?.toUpperCase() ?? "DOKUMAN";
}

function getContextMessage(context: QuizContextInfo | null, quiz: QuizPayload | null): string {
  if (context?.assistantMessage) return context.assistantMessage;
  const count = quiz?.questions.length ?? 0;
  if (context?.documentTitle) {
    return `${context.documentTitle} hakkinda ${count} soru hazirladim. Basarilar dilerim.`;
  }
  if (count > 0) {
    return `Istedigin konu hakkinda ${count} soru hazirladim. Basarilar dilerim.`;
  }
  return "Sorular hazirlaniyor...";
}

function TestLoadingPanel({ context }: { context: QuizContextInfo | null }) {
  const loadingTitle = context?.documentTitle
    ? `${context.documentTitle} için sorular hazırlanıyor...`
    : "Sorular hazırlanıyor...";

  return (
    <section className="flex h-full min-h-[420px] flex-col justify-center rounded-[22px] border border-[#AFA2A2] bg-[#C8BDBD] px-6 py-8 shadow-sm">
      <div className="mx-auto flex max-w-[360px] flex-col items-center text-center text-[#1a1a1a]">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[16px] bg-white/45">
          <LoadingDots />
        </div>
        <h3 className="m-0 text-[20px] font-semibold">
          {loadingTitle}
        </h3>
        <p className="m-0 mt-2 text-[14px] leading-relaxed text-[#5B4F4B]">
          Test alanı hazırlanırken sohbetine sol panelden devam edebilirsin.
        </p>
      </div>
    </section>
  );
}

function TestErrorPanel({ error }: { error: string }) {
  return (
    <section className="flex h-full min-h-[420px] flex-col justify-center rounded-[22px] border border-red-200 bg-red-50 px-6 py-8 text-center shadow-sm">
      <h3 className="m-0 text-[20px] font-semibold text-red-700">
        Test sorulari olusturulamadi
      </h3>
      <p className="m-0 mt-2 text-[14px] leading-relaxed text-red-600">
        {error}
      </p>
    </section>
  );
}

function TestPlaceholderPanel() {
  return (
    <section className="flex h-full min-h-[420px] flex-col justify-center rounded-[22px] border border-[#D6CCCC] bg-white/45 px-6 py-8 text-center shadow-sm">
      <h3 className="m-0 text-[20px] font-semibold text-[#1a1a1a]">
        Test modu hazir
      </h3>
      <p className="m-0 mt-2 text-[14px] leading-relaxed text-[#5B4F4B]">
        Sol taraftan bir dokuman ekleyip prompt gonderdiginde sorular burada gorunecek.
      </p>
    </section>
  );
}

export default function QuizWorkspace({
  quiz,
  context,
  composer,
  messages,
  streamingContent,
  isLoading,
  error,
  currentQuestionIndex,
  answers,
  result,
  isSaving,
  onQuestionChange,
  onAnswer,
  onFinish,
  onAskAI,
  saveStatus,
  saveError,
}: QuizWorkspaceProps) {
  const title = context?.documentTitle ?? quiz?.title ?? "Test";
  const contextMessage = getContextMessage(context, quiz);
  const firstUserMessage = messages.find((message) => message.role === "user");
  const documentTitle =
    context?.documentTitle ?? firstUserMessage?.attachments?.[0]?.name ?? null;
  const visibleMessages = messages
    .slice(1)
    .filter((message) => !message.metadata?.quiz);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(340px,0.42fr)_minmax(440px,0.58fr)]">
      <motion.section
        initial={{ opacity: 0, x: 26 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-[22px] bg-transparent"
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4 pb-4">
            {(context?.prompt || messages[0]?.content) && (
              <div className="ml-auto flex w-full max-w-[420px] flex-col items-end gap-2">
                {documentTitle && (
                  <div className="max-w-[240px] rounded-[10px] border border-[#D4C4C4] bg-white/80 px-3 py-2 text-[#1a1a1a] shadow-sm">
                    <p className="m-0 max-w-[200px] truncate text-[12px] font-semibold">
                      {documentTitle}
                    </p>
                    <p className="m-0 mt-1 text-[10px] font-semibold uppercase text-[#6B6161]">
                      {context ? getDocumentType(context) : documentTitle.split(".").pop()?.toUpperCase() ?? "DOSYA"}
                    </p>
                  </div>
                )}
                <div className="w-full rounded-[18px] bg-[#B7AAAA] px-5 py-3 text-[15px] font-medium text-[#1a1a1a] shadow-sm">
                  {context?.prompt ?? messages[0]?.content}
                </div>
              </div>
            )}

            <div className="w-full max-w-[440px] rounded-[18px] bg-white/55 px-5 py-4 text-[#1a1a1a] shadow-sm">
              <p className="m-0 whitespace-pre-line text-[17px] font-medium leading-relaxed">
                {contextMessage}
              </p>
              {quiz && (
                <p className="m-0 mt-4 text-[14px] leading-relaxed text-[#5B4F4B]">
                  Sorular arasinda serbestce gezebilir, cevaplamadiklarini test sonunda bos birakilmis olarak saydirabilirsin.
                </p>
              )}
            </div>

            {visibleMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "rounded-br-md bg-[#8B6B6B] text-white"
                      : "rounded-bl-md border border-[#E8E8E8] bg-white text-[#1a1a1a] shadow-sm"
                  }`}
                >
                  {msg.role === "model" ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[#E8E8E8] bg-white px-4 py-3 text-[14px] leading-relaxed text-[#1a1a1a] shadow-sm whitespace-pre-wrap">
                  <MarkdownMessage content={streamingContent} live />
                </div>
              </div>
            )}

            {isLoading && !streamingContent && quiz && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-[#E8E8E8] bg-white px-4 py-2 text-[13px] text-[#5B4F4B] shadow-sm">
                  <span>Yükleniyor</span>
                  <LoadingDots />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 pt-3">
          {composer}
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, x: 36 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-[520px] min-w-0"
      >
        {quiz ? (
          <QuizPanel
            quiz={quiz}
            title={title}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            result={result}
            isSaving={isSaving}
            onQuestionChange={onQuestionChange}
            onAnswer={onAnswer}
            onFinish={onFinish}
            onAskAI={onAskAI}
            saveStatus={saveStatus}
            saveError={saveError}
          />
        ) : isLoading ? (
          <TestLoadingPanel context={context} />
        ) : error ? (
          <TestErrorPanel error={error} />
        ) : (
          <TestPlaceholderPanel />
        )}
      </motion.div>
    </div>
  );
}
