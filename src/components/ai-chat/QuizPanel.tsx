import { useMemo, useState, useEffect } from "react";
import type {
  QuizPayload,
  QuizQuestion,
  QuizResult,
  QuizSaveStatus,
} from "../../types/quiz.types";
import type { QuizSelectionMap } from "../../services/quiz/quizStats";
import QuizResultSummary from "./QuizResultSummary";

type QuizPanelProps = {
  quiz: QuizPayload;
  title: string;
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

function buildAskPrompt(question: QuizQuestion): string {
  const options = question.options
    .map((option) => `${option.id}) ${option.text}`)
    .join("\n");

  return [
    "Bu test sorusunu açıkla ve doğru cevabı adım adım anlat:",
    "",
    "Soru:",
    question.question,
    "",
    "Şıklar:",
    options,
    "",
    "Doğru cevap sistemde kayıtlı ancak önce konuyu anlaşılır şekilde açıkla.",
  ].join("\n");
}

function getQuestionStatus(
  question: QuizQuestion,
  selections: QuizSelectionMap
): "unanswered" | "correct" | "wrong" {
  if (!Object.prototype.hasOwnProperty.call(selections, question.id)) {
    return "unanswered";
  }

  return selections[question.id] === question.correctOptionId ? "correct" : "wrong";
}

function getSegmentClass(status: "unanswered" | "correct" | "wrong", active: boolean): string {
  if (status === "correct") return active ? "bg-[#1F9D49] ring-2 ring-[#167A3B]/25" : "bg-[#2DBE68]";
  if (status === "wrong") return active ? "bg-[#D84C4C] ring-2 ring-[#C93A3A]/25" : "bg-[#EF5A5A]";
  return active ? "bg-[#5B4F4B] ring-2 ring-[#5B4F4B]/20" : "bg-white";
}

export default function QuizPanel({
  quiz,
  title,
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
}: QuizPanelProps) {
  const currentIndex = Math.min(currentQuestionIndex, Math.max(quiz.questions.length - 1, 0));
  const question = quiz.questions[currentIndex];
  const selectedOptionId = question ? answers[question.id] : null;
  const answered = question
    ? Object.prototype.hasOwnProperty.call(answers, question.id)
    : false;
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === quiz.questions.length - 1;

  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (!result) {
      setShowReview(false);
    }
  }, [result]);

  const counts = useMemo(() => {
    return quiz.questions.reduce(
      (acc, item) => {
        const status = getQuestionStatus(item, answers);
        if (status === "correct") acc.correct += 1;
        if (status === "wrong") acc.wrong += 1;
        return acc;
      },
      { correct: 0, wrong: 0 }
    );
  }, [quiz.questions, answers]);

  function selectOption(optionId: string) {
    if (!question || answered || result) return;
    onAnswer(question.id, optionId);
  }

  function goNext() {
    if (isLastQuestion) {
      if (result) {
        setShowReview(false);
      } else {
        onFinish();
      }
      return;
    }
    onQuestionChange(currentIndex + 1);
  }

  function getOptionClass(optionId: string): string {
    if (!question || (!answered && !result)) {
      return "border-white/70 bg-white text-[#1a1a1a] hover:border-[#8E7777]/50 hover:bg-[#FAF8F7]";
    }

    if (optionId === question.correctOptionId) {
      return "border-[#2DBE68] bg-[#EAF8EF] text-[#167A3B] shadow-[0_0_0_1px_rgba(45,190,104,0.2)]";
    }

    if (optionId === selectedOptionId) {
      return "border-[#FF6B6B] bg-[#FFECEC] text-[#C93A3A] shadow-[0_0_0_1px_rgba(239,90,90,0.18)]";
    }

    return "border-white/70 bg-white/80 text-[#737373]";
  }

  if (quiz.questions.length === 0) {
    return (
      <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-5 text-[#5B4F4B]">
        <h3 className="m-0 text-[20px] font-semibold text-[#1a1a1a]">
          {quiz.title}
        </h3>
        <p className="m-0 mt-3 text-[14px] leading-relaxed text-amber-800">
          Test sorusu üretmek için yeterli içerik bulunamadı. Lütfen daha açıklayıcı
          bir prompt yazın veya okunabilir metni olan bir doküman seçin.
        </p>
      </div>
    );
  }

  if (result && !showReview) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 rounded-[22px] border border-[#AFA2A2] bg-[#C8BDBD] p-5 shadow-sm">
        <section className="rounded-[16px] bg-[#D3BFBF] px-5 py-4">
          <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-[#5B4F4B]">
            Test Sonucu
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="m-0 truncate text-[20px] font-semibold text-[#1a1a1a]">
                {title}
              </h3>
              <p className="m-0 mt-1 text-[13px] text-[#5B4F4B]">
                Başarı oranı %{result.successRate}
              </p>
            </div>
            <div className="text-[38px] font-semibold leading-none text-[#1F9D49]">
              %{result.successRate}
            </div>
          </div>
        </section>

        <QuizResultSummary result={result} />

        <div className="rounded-[14px] border border-white/50 bg-white/65 px-4 py-3 text-[13px] text-[#5B4F4B] w-full">
          {saveStatus === "saving" && "Sonuç kaydediliyor..."}
          {saveStatus === "saved" && "Test sonucu kaydedildi."}
          {saveStatus === "error" && (saveError ?? "Test sonucu kaydedilemedi.")}
          {saveStatus === "idle" && "Sonuç hazır."}
        </div>

        <div className="flex justify-end mt-auto pt-4">
          <button
            type="button"
            onClick={() => {
              setShowReview(true);
              onQuestionChange(0);
            }}
            className="h-11 rounded-full border-0 bg-[#5B4F4B] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#3F3131] cursor-pointer shrink-0 w-full sm:w-auto"
          >
            Sorulara Dön
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#AFA2A2] bg-[#C8BDBD] shadow-sm">
      <header className="shrink-0 bg-[#D3BFBF] px-5 py-4 sm:px-6">
        <h3 className="m-0 truncate text-[17px] font-semibold text-[#1a1a1a]">
          {title}
        </h3>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-6">
        <div className="shrink-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#3F3131]">
              İlerleme
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold uppercase text-[#1a1a1a]">
                Soru {currentIndex + 1} / {quiz.questions.length}
              </span>
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#E6A4A4] px-3 text-[12px] font-semibold text-[#9B1F1F]">
                × {counts.wrong}
              </span>
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#A8D6AC] px-3 text-[12px] font-semibold text-[#167A3B]">
                ✓ {counts.correct}
              </span>
            </div>
          </div>

          <div className="grid grid-flow-col auto-cols-fr gap-2">
            {quiz.questions.map((item, index) => {
              const status = getQuestionStatus(item, answers);
              const active = index === currentIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onQuestionChange(index)}
                  className={`h-2.5 min-w-5 rounded-full border-0 transition-all cursor-pointer ${getSegmentClass(status, active)}`}
                  aria-label={`Soru ${index + 1}`}
                  title={`Soru ${index + 1}`}
                />
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-6">
          <div className="flex gap-3 text-[#1a1a1a]">
            <span className="shrink-0 text-[16px] font-semibold">
              {currentIndex + 1}.
            </span>
            <p className="m-0 text-[17px] font-medium leading-relaxed">
              {question.question}
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => selectOption(option.id)}
                disabled={answered}
                className={`flex min-h-14 items-center gap-5 rounded-[12px] border px-5 py-3 text-left text-[15px] font-medium transition-colors cursor-pointer disabled:cursor-default ${getOptionClass(option.id)}`}
              >
                <span className="w-8 shrink-0 text-center text-[18px] font-semibold">
                  {option.id}
                </span>
                <span className="leading-relaxed">{option.text}</span>
              </button>
            ))}
          </div>

          {(answered || result) && (
            <div className="mt-5 rounded-[14px] border border-white/60 bg-white/60 px-4 py-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#5B4F4B]">
                Açıklama
              </p>
              <p className="m-0 mt-1 text-[13px] leading-relaxed text-[#1a1a1a]">
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 pt-3">
          <button
            type="button"
            onClick={() => onAskAI(buildAskPrompt(question))}
            className="h-11 rounded-[12px] border-0 bg-transparent px-3 text-[13px] font-semibold text-[#5B4F4B] transition-colors hover:bg-white/35 cursor-pointer"
          >
            Yapay Zekaya Sor
          </button>

          <div className="ml-auto flex items-center justify-end gap-2">
            {!isFirstQuestion && (
              <button
                type="button"
                onClick={() => onQuestionChange(Math.max(0, currentIndex - 1))}
                className="h-11 rounded-[12px] border-0 bg-transparent px-5 text-[13px] font-semibold text-[#5B4F4B] transition-colors hover:bg-white/35 cursor-pointer"
              >
                Geri
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={isSaving && !result}
              className="h-11 rounded-full border-0 bg-[#5B4F4B] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#3F3131] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLastQuestion ? (result ? "Sonuçlara Dön" : (isSaving ? "Kaydediliyor..." : "Bitir")) : "İleri"}
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
