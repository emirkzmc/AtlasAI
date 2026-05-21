import type { AiChatMode, QuizContextInfo, QuizPayload, QuizResult } from "./quiz.types";

export type GeminiModelId =
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash-lite"
  | "gemini-2.0-flash";

export type ChatMessageRole = "user" | "model";

export interface ChatAttachmentMeta {
  id?: string;
  name: string;
  type: string;
  size: number;
  createdAt?: string;
}

export interface AiChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: Date;
  attachments?: ChatAttachmentMeta[];
  metadata?: {
    chatMode?: AiChatMode;
    quiz?: QuizPayload;
    quizContext?: QuizContextInfo;
    quizResult?: QuizResult;
    quizAnswers?: Record<string, string | null>;
  };
}

export interface AiChatSummary {
  id: string;
  title: string;
  model: GeminiModelId;
  mode?: AiChatMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiChatState {
  chats: AiChatSummary[];
  activeChatId: string | null;
  messages: AiChatMessage[];
  selectedModel: GeminiModelId;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  streamingContent: string;
  error: string | null;
  pendingAttachments: ChatAttachmentMeta[];
}
