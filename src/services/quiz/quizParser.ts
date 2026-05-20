import type {
  QuizDifficulty,
  QuizOption,
  QuizPayload,
  QuizQuestion,
  QuizSourceType,
} from "../../types/quiz.types";

export class QuizParseError extends Error {
  constructor(message = "Test soruları oluşturulamadı.") {
    super(message);
    this.name = "QuizParseError";
  }
}

const DIFFICULTIES: readonly QuizDifficulty[] = ["easy", "medium", "hard"];
const SOURCE_TYPES: readonly QuizSourceType[] = ["document", "general"];

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim().replace(/^\uFEFF/, "");
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new QuizParseError("AI test yanıtı nesne formatında değil.");
  }

  return value as Record<string, unknown>;
}

function readNonEmptyString(
  record: Record<string, unknown>,
  key: string,
  context: string
): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new QuizParseError(`${context}: ${key} alanı geçersiz.`);
  }

  return value.trim();
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new QuizParseError(`${key} alanı string veya null olmalı.`);
  }

  return value.trim() || null;
}

function validateDifficulty(value: unknown): QuizDifficulty {
  if (typeof value === "string" && DIFFICULTIES.includes(value as QuizDifficulty)) {
    return value as QuizDifficulty;
  }

  throw new QuizParseError("Soru zorluk seviyesi geçersiz.");
}

function validateSourceType(value: unknown): QuizSourceType {
  if (typeof value === "string" && SOURCE_TYPES.includes(value as QuizSourceType)) {
    return value as QuizSourceType;
  }

  throw new QuizParseError("Test kaynak tipi geçersiz.");
}

function validateOption(value: unknown, questionId: string): QuizOption {
  const option = asRecord(value);

  return {
    id: readNonEmptyString(option, "id", `${questionId} şıkkı`),
    text: readNonEmptyString(option, "text", `${questionId} şıkkı`),
  };
}

function hasDuplicate(values: string[]): boolean {
  return new Set(values.map((value) => value.trim().toLowerCase())).size !== values.length;
}

function validateQuestion(value: unknown, index: number): QuizQuestion {
  const question = asRecord(value);
  const id = readNonEmptyString(question, "id", `Soru ${index + 1}`);
  const optionsValue = question.options;

  if (!Array.isArray(optionsValue) || optionsValue.length !== 4) {
    throw new QuizParseError(`${id}: Her soruda tam 4 şık olmalı.`);
  }

  const options = optionsValue.map((option) => validateOption(option, id));
  const optionIds = options.map((option) => option.id);
  const optionTexts = options.map((option) => option.text);

  if (hasDuplicate(optionIds) || hasDuplicate(optionTexts)) {
    throw new QuizParseError(`${id}: Şıklar tekrar etmemeli.`);
  }

  const correctOptionId = readNonEmptyString(question, "correctOptionId", id);
  if (!optionIds.includes(correctOptionId)) {
    throw new QuizParseError(`${id}: Doğru şık mevcut şıklardan biri değil.`);
  }

  const documentReferenceValue = question.documentReference;
  const documentReference =
    typeof documentReferenceValue === "string" && documentReferenceValue.trim()
      ? documentReferenceValue.trim()
      : undefined;

  return {
    id,
    question: readNonEmptyString(question, "question", id),
    options,
    correctOptionId,
    explanation: readNonEmptyString(question, "explanation", id),
    difficulty: validateDifficulty(question.difficulty),
    documentReference,
  };
}

export function parseQuizResponse(raw: string): QuizPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch (error) {
    console.error("[parseQuizResponse] JSON parse failed:", error, { raw });
    throw new QuizParseError();
  }

  try {
    const payload = asRecord(parsed);
    const mode = payload.mode;

    if (mode !== "test") {
      throw new QuizParseError("Test yanıtı mode=test içermiyor.");
    }

    const questionsValue = payload.questions;
    if (!Array.isArray(questionsValue)) {
      throw new QuizParseError("questions alanı dizi olmalı.");
    }

    return {
      mode: "test",
      title: readNonEmptyString(payload, "title", "Test"),
      sourceType: validateSourceType(payload.sourceType),
      documentId: readNullableString(payload, "documentId"),
      questions: questionsValue.map(validateQuestion),
    };
  } catch (error) {
    if (error instanceof QuizParseError) {
      console.error("[parseQuizResponse] Schema validation failed:", error.message, {
        raw,
      });
      throw error;
    }

    console.error("[parseQuizResponse] Unexpected validation error:", error, { raw });
    throw new QuizParseError();
  }
}
