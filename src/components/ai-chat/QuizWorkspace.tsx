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
  onOpenQuiz?: (messageId: string) => void;
};


function TestLoadingPanel({ context }: { context: QuizContextInfo | null }) {
  const loadingTitle = context?.documentTitle
    ? `${context.documentTitle} için sorular hazırlanıyor...`
    : "Sorular hazırlanıyor...";

  return (
    <section className="flex h-full min-h-105 flex-col justify-center rounded-[22px] border border-[#AFA2A2] bg-[#C8BDBD] px-6 py-8 shadow-sm">
      <div className="mx-auto flex max-w-90 flex-col items-center text-center text-[#1a1a1a]">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/45">
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
    <section className="flex h-full min-h-105 flex-col justify-center rounded-[22px] border border-red-200 bg-red-50 px-6 py-8 text-center shadow-sm">
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
    <section className="flex h-full min-h-105 flex-col justify-center rounded-[22px] border border-[#D6CCCC] bg-white/45 px-6 py-8 text-center shadow-sm">
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
  onOpenQuiz,
}: QuizWorkspaceProps) {
  const title = context?.documentTitle ?? quiz?.title ?? "Test";
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(340px,0.42fr)_minmax(440px,0.58fr)]">
      <motion.section
        initial={{ opacity: 0, x: 26 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-130 min-w-0 flex-col overflow-hidden rounded-[22px] bg-transparent"
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4 pb-4">
            {messages.map((msg, idx) => {
              if (msg.role === "user") {
                const docTitle = msg.attachments?.[0]?.name ?? null;
                const docExt = docTitle?.split(".").pop()?.toUpperCase() ?? "DOSYA";

                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="flex w-full max-w-[92%] flex-col items-end gap-2">
                      {docTitle && (
                        <div className="max-w-60 rounded-[10px] border border-[#D4C4C4] bg-white/80 px-3 py-2 text-[#1a1a1a] shadow-sm">
                          <p className="m-0 max-w-50 truncate text-[12px] font-semibold">
                            {docTitle}
                          </p>
                          <p className="m-0 mt-1 text-[10px] font-semibold uppercase text-[#6B6161]">
                            {docExt}
                          </p>
                        </div>
                      )}
                      <div className="rounded-2xl rounded-br-md bg-[#8B6B6B] px-4 py-3 text-[14px] leading-relaxed text-white whitespace-pre-wrap shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              }

              // model
              const isQuizMessage = !!msg.metadata?.quiz;
              const isFirstQuizMessage = isQuizMessage && messages.findIndex(m => !!m.metadata?.quiz) === idx;

              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="w-full max-w-[92%]">
                    <div className="rounded-2xl rounded-bl-md border border-[#E8E8E8] bg-white px-4 py-3 text-[#1a1a1a] shadow-sm">
                      <div className={`flex flex-col sm:flex-row ${isQuizMessage ? "sm:items-center" : "items-start"} justify-between gap-3`}>
                        <div className="flex-1 text-[14px] leading-relaxed">
                          <MarkdownMessage content={msg.content} />
                        </div>
                        {isQuizMessage && (
                          <button
                            onClick={() => onOpenQuiz?.(msg.id)}
                            className="shrink-0 cursor-pointer px-4 py-1.5 bg-[#8B6B6B] text-white text-sm font-medium rounded-lg hover:bg-[#7a5c5c] transition-colors shadow-sm"
                          >
                            Testi Görüntüle
                          </button>
                        )}
                      </div>
                      {isFirstQuizMessage && (
                        <p className="m-0 mt-3 border-t border-[#E8E8E8] pt-3 text-[13px] leading-relaxed text-[#5B4F4B]">
                          Sorular arasında serbestçe gezebilir, cevaplamadıklarını test sonunda boş bırakılmış olarak saydırabilirsin.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}



            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[#E8E8E8] bg-white px-4 py-3 text-[14px] leading-relaxed text-[#1a1a1a] shadow-sm">
                  <MarkdownMessage content={streamingContent} live />
                </div>
              </div>
            )}

            {isLoading && !streamingContent && quiz && (
              <div className="flex justify-start">
                <div className="flex items-center rounded-2xl rounded-bl-md border border-[#E8E8E8] bg-white px-3 py-1.5 shadow-sm">
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
        className="min-h-130 min-w-0 relative"
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
