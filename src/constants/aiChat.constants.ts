import type { GeminiModelId } from "../types/aiChat.types";

export const GEMINI_MODELS: { id: GeminiModelId; label: string }[] = [
  { id: "gemini-2.5-flash", label: "gemini-2.5-flash" },
  { id: "gemini-2.5-pro", label: "gemini-2.5-pro" },
  { id: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite" },
  { id: "gemini-2.0-flash", label: "gemini-2.0-flash" },
];

export const DEFAULT_GEMINI_MODEL: GeminiModelId = "gemini-2.5-flash";

/** Dosya seçici için kabul edilen MIME / uzantılar */
export const AI_CHAT_ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/jpg",
] as const;

export const AI_CHAT_ACCEPTED_EXTENSIONS =
  ".pdf,.txt,.docx,.png,.jpg,.jpeg";

export const AI_CHAT_MAX_FILE_BYTES = 5 * 1024 * 1024;
