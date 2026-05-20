import { useCallback, useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { getDownloadURL, getStorage, ref as storageRef } from "firebase/storage";
import { useAuth } from "./useAuth";
import { DEFAULT_GEMINI_MODEL } from "../constants/aiChat.constants";
import {
  AI_CHAT_MAX_FILE_BYTES,
} from "../constants/aiChat.constants";
import type {
  AiChatMessage,
  AiChatSummary,
  ChatAttachmentMeta,
  GeminiModelId,
} from "../types/aiChat.types";
import type {
  AiChatMode,
  QuizContextInfo,
  QuizPayload,
  QuizResult,
  QuizSaveStatus,
  QuizSourceType,
} from "../types/quiz.types";
import {
  createChat,
  deleteChat as deleteStoredChat,
  fetchChatMessages,
  fetchUserChats,
  saveMessage,
  titleFromMessage,
  updateChatMeta,
} from "../services/aiChat.service";
import { app, storageApp } from "../services/firebase.config";
import {
  generateGeminiContent,
  streamGeminiChat,
  type GeminiContentPart,
  type GeminiPart,
} from "../services/gemini.service";
import { fetchDocuments } from "../services/docs.service";
import type { IDocument } from "../components/docs/types";
import {
  buildLessonSystemInstruction,
  buildTestSystemInstruction,
  buildTestUserPrompt,
} from "../services/ai/buildPrompt";
import { parseQuizResponse } from "../services/quiz/quizParser";
import {
  calculateQuizResult,
  type QuizSelectionMap,
} from "../services/quiz/quizStats";
import { saveQuizAttempt } from "../services/quizAttempts.service";

type PendingDocumentContext = {
  id: string;
  text?: string;
  part?: GeminiPart;
};

interface NormalizedDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt?: string;
  downloadUrl: string | null;
  storagePath: string | null;
  extractedText: string | null;
  contentStatus?: IDocument["contentStatus"];
  extension: string;
  isTxt: boolean;
  isPdf: boolean;
  isPptx: boolean;
}

const storage = getStorage(storageApp);

function getDocumentExtension(documentName: string): string {
  return documentName.split(".").pop()?.toLowerCase() ?? "";
}

function getDocumentMimeType(documentName: string, document: IDocument): string {
  const ext = getDocumentExtension(documentName);
  if (document.mimeType) return document.mimeType;
  if (document.type) return document.type;
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  if (ext === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return ext || "unknown";
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? null;
}

function normalizeDocument(document: IDocument): NormalizedDocument {
  const name = firstNonEmpty([document.name, document.fileName]) ?? "Bilinmeyen doküman";
  const extension = getDocumentExtension(name);
  const mimeType = getDocumentMimeType(name, document);
  return {
    id: document.id,
    name,
    mimeType,
    size: document.size ?? 0,
    createdAt: document.createdAt,
    downloadUrl: firstNonEmpty([
      document.downloadURL,
      document.downloadUrl,
      document.fileUrl,
      document.contentUrl,
      document.url,
    ]),
    storagePath: firstNonEmpty([document.storagePath, document.path]),
    extractedText: firstNonEmpty([
      document.extractedText,
      document.contentText,
      document.textContent,
      document.plainText,
    ]),
    contentStatus: document.contentStatus,
    extension,
    isTxt: mimeType === "text/plain" || extension === "txt",
    isPdf: mimeType === "application/pdf" || extension === "pdf",
    isPptx: mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || extension === "pptx",
  };
}

function buildQuizContextMessage(
  documentTitle: string | null,
  questionCount: number
): string {
  if (documentTitle) {
    return `${documentTitle} hakkında ${questionCount} soru hazırladım. Başarılar dilerim.`;
  }

  return `İstediğin konu hakkında ${questionCount} soru hazırladım. Başarılar dilerim.`;
}

function findStoredQuiz(messages: AiChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const metadata = messages[index]?.metadata;
    if (metadata?.quiz) {
      return {
        quiz: metadata.quiz,
        context: metadata.quizContext ?? null,
      };
    }
  }

  return null;
}

async function resolveDocumentUrl(document: NormalizedDocument): Promise<string | null> {
  if (document.downloadUrl) {
    console.debug("[AtlasAI Document] Using downloadURL", {
      id: document.id,
      name: document.name,
    });
    return document.downloadUrl;
  }

  if (!document.storagePath) return null;

  console.debug("[AtlasAI Document] Resolving Storage path", {
    id: document.id,
    name: document.name,
    storagePath: document.storagePath,
  });
  return getDownloadURL(storageRef(storage, document.storagePath));
}

function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Doküman içeriği okunamadı."));
        return;
      }
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Doküman içeriği okunamadı."));
    reader.readAsDataURL(new Blob([buffer]));
  });
}

export function useAiChat(isOpen: boolean) {
  const { user, loading: authLoading } = useAuth();
  const currentAuthUid = getAuth(app).currentUser?.uid ?? null;
  const uid =
    !authLoading && user?.uid && currentAuthUid === user.uid ? user.uid : undefined;

  const [chats, setChats] = useState<AiChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(DEFAULT_GEMINI_MODEL);
  const [chatMode, setChatModeState] = useState<AiChatMode>("lesson");
  const [lastTestPrompt, setLastTestPrompt] = useState("");
  const [activeQuiz, setActiveQuiz] = useState<QuizPayload | null>(null);
  const [activeQuizContext, setActiveQuizContext] = useState<QuizContextInfo | null>(null);
  const [activeQuizDocumentTitle, setActiveQuizDocumentTitle] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizSelectionMap>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizSaveStatus, setQuizSaveStatus] = useState<QuizSaveStatus>("idle");
  const [quizSaveError, setQuizSaveError] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentMeta[]>([]);
  const [pendingDocumentContexts, setPendingDocumentContexts] = useState<PendingDocumentContext[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<IDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const quizSaveRef = useRef<string | null>(null);
  const isChatModeLocked = Boolean(activeChatId || messages.length > 0 || activeQuiz || isSending);

  const resetQuizState = useCallback(() => {
    setLastTestPrompt("");
    setActiveQuiz(null);
    setActiveQuizContext(null);
    setActiveQuizDocumentTitle(null);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizResult(null);
    setQuizSaveStatus("idle");
    setQuizSaveError(null);
    quizSaveRef.current = null;
  }, []);

  const loadChats = useCallback(async () => {
    if (authLoading || !uid) return;
    await Promise.resolve(); // Defer state update to avoid sync setState in effect warning
    setIsLoadingChats(true);
    setError(null);
    try {
      const list = await fetchUserChats(uid);
      setChats(list);
    } catch (err) {
      console.error("[useAiChat] loadChats:", err);
      setError(err instanceof Error ? err.message : "Sohbetler yüklenemedi.");
    } finally {
      setIsLoadingChats(false);
    }
  }, [authLoading, uid]);

  useEffect(() => {
    if (!isOpen || authLoading || !uid) return;
    const timeoutId = window.setTimeout(() => {
      void loadChats();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, authLoading, uid, loadChats]);

  const loadDocuments = useCallback(async () => {
    if (authLoading || !uid) return;
    await Promise.resolve(); // Defer state update
    setIsLoadingDocuments(true);
    try {
      const list = await fetchDocuments(uid);
      setAvailableDocuments(list);
    } catch (err) {
      console.error("[useAiChat] loadDocuments:", err);
      setError("Dokümanlar yüklenemedi.");
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [authLoading, uid]);

  useEffect(() => {
    if (!isOpen || authLoading || !uid) return;
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, authLoading, uid, loadDocuments]);

  useEffect(() => {
    if (isOpen) return;
    const timeoutId = window.setTimeout(() => {
      resetQuizState();
      setStreamingContent("");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, resetQuizState]);

  const setChatMode = useCallback(
    (mode: AiChatMode) => {
      if (activeChatId || messages.length > 0 || activeQuiz || isSending) return;
      setChatModeState(mode);
      setError(null);
      setStreamingContent("");
    },
    [activeChatId, activeQuiz, isSending, messages.length]
  );

  const loadMessages = useCallback(
    async (chatId: string) => {
      if (authLoading || !uid) return;
      await Promise.resolve(); // Defer state update
      setIsLoadingMessages(true);
      setError(null);
      try {
        const msgs = await fetchChatMessages(uid, chatId);
        setMessages(msgs);
        const chat = chats.find((c) => c.id === chatId);
        if (chat) {
          setSelectedModel(chat.model);
          setChatModeState(chat.mode ?? "lesson");
        }
        const storedQuiz = findStoredQuiz(msgs);
        if (storedQuiz) {
          setChatModeState("test");
          setActiveQuiz(storedQuiz.quiz);
          setActiveQuizContext(storedQuiz.context);
          setActiveQuizDocumentTitle(storedQuiz.context?.documentTitle ?? null);
          setLastTestPrompt(storedQuiz.context?.prompt ?? "");
          setCurrentQuestionIndex(0);
          setQuizAnswers({});
          setQuizResult(null);
          setQuizSaveStatus("idle");
          setQuizSaveError(null);
          quizSaveRef.current = null;
        }
      } catch (err) {
        console.error("[useAiChat] loadMessages:", err);
        setError(err instanceof Error ? err.message : "Mesajlar yüklenemedi.");
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [authLoading, uid, chats]
  );

  const selectChat = useCallback(
    (chatId: string) => {
      setActiveChatId(chatId);
      setStreamingContent("");
      resetQuizState();
      void loadMessages(chatId);
    },
    [loadMessages, resetQuizState]
  );

  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setStreamingContent("");
    setPendingAttachments([]);
    setPendingDocumentContexts([]);
    setError(null);
    resetQuizState();
  }, [resetQuizState]);

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (authLoading || !uid || deletingChatId) return;

      setDeletingChatId(chatId);
      setError(null);
      if (activeChatId === chatId) abortRef.current?.abort();

      try {
        await deleteStoredChat(uid, chatId);
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));

        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
          setStreamingContent("");
          setPendingAttachments([]);
          setPendingDocumentContexts([]);
          resetQuizState();
        }
      } catch (err) {
        console.error("[useAiChat] deleteChat:", err);
        setError(err instanceof Error ? err.message : "Sohbet silinemedi.");
      } finally {
        setDeletingChatId(null);
      }
    },
    [activeChatId, authLoading, deletingChatId, resetQuizState, uid]
  );

  const addDocumentAttachment = useCallback(async (document: IDocument) => {
    const normalized = normalizeDocument(document);
    console.debug("[AtlasAI Document] Selected document:", {
      id: normalized.id,
      name: normalized.name,
      mimeType: normalized.mimeType,
      contentStatus: normalized.contentStatus,
      hasExtractedText: Boolean(normalized.extractedText),
      hasDownloadUrl: Boolean(normalized.downloadUrl),
      hasStoragePath: Boolean(normalized.storagePath),
    });

    if (pendingAttachments.some((attachment) => attachment.id === normalized.id)) {
      setError("Bu doküman zaten sohbet bağlamına eklendi.");
      return;
    }

    const allowedExtensions = ["pdf", "txt", "pptx", "ppt", "docx", "doc", "jpg", "jpeg", "png"];
    const isSupportedDoc = allowedExtensions.includes(normalized.extension) || 
                           normalized.mimeType.startsWith("image/") || 
                           normalized.isTxt || normalized.isPdf || normalized.isPptx;

    if (!isSupportedDoc) {
      console.warn("[AtlasAI Document] Unsupported readable type", normalized);
      setError("Bu dokümanın içeriği şu anda okunamıyor. Lütfen desteklenen formatlarda (PDF, PPTX, DOCX, TXT, resim) bir doküman seçin.");
      return;
    }

    if (normalized.size > AI_CHAT_MAX_FILE_BYTES && !normalized.extractedText) {
      setError("Sohbet bağlamına eklenecek doküman en fazla 5 MB olabilir.");
      return;
    }

    setError(null);

    try {
      const meta: ChatAttachmentMeta = {
        id: normalized.id,
        name: normalized.name,
        type: normalized.mimeType,
        size: normalized.size,
        createdAt: normalized.createdAt,
      };

      if (normalized.extractedText) {
        console.debug("[AtlasAI Document] Using extractedText from Firestore", {
          id: normalized.id,
          name: normalized.name,
        });
        const clipped = normalized.extractedText.slice(0, 12000);
        setPendingDocumentContexts((prev) => [
          ...prev,
          { id: normalized.id, text: `--- ${normalized.name} ---\n${clipped}` },
        ]);
        setPendingAttachments((prev) => [...prev, meta]);
        return;
      }

      console.warn("[AtlasAI Document] No extractedText found", {
        id: normalized.id,
        name: normalized.name,
        contentStatus: normalized.contentStatus,
      });

      const url = await resolveDocumentUrl(normalized);
      if (!url) {
        console.warn("[AtlasAI Document] No readable content found", {
          id: normalized.id,
          name: normalized.name,
          contentStatus: normalized.contentStatus,
        });
        const message =
          normalized.contentStatus === "metadata_only" || !normalized.contentStatus
            ? "Bu doküman eski metadata kaydı olduğu için içeriği okunamıyor. Lütfen dosyayı yeniden yükleyin."
            : "Bu dokümanın yalnızca kayıt bilgisi var, gerçek dosya içeriğine ulaşılamıyor. Lütfen dokümanı tekrar yükleyin veya Storage ayarını aktif edin.";
        setError(message);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Doküman içeriği alınamadı.");

      if (normalized.isTxt) {
        const text = await response.text();
        const clipped = text.slice(0, 12000);
        setPendingDocumentContexts((prev) => [
          ...prev,
          { id: normalized.id, text: `--- ${normalized.name} ---\n${clipped}` },
        ]);
      } else {
        const isOfficeDoc = normalized.isPptx || 
                            normalized.extension === "docx" || 
                            normalized.extension === "doc" || 
                            normalized.mimeType.includes("officedocument");
                            
        if (isOfficeDoc) {
          setError("Bu ofis dosyasının (PPTX/DOCX) çıkarılmış bir metni bulunamadı. Lütfen eski kaydı silip dosyayı Dokümanlarım sayfasından YENİDEN YÜKLEYİN.");
          return;
        }

        const base64 = await arrayBufferToBase64(await response.arrayBuffer());
        setPendingDocumentContexts((prev) => [
          ...prev,
          {
            id: normalized.id,
            part: { inlineData: { mimeType: normalized.mimeType, data: base64 } },
          },
        ]);
      }

      setPendingAttachments((prev) => [...prev, meta]);
    } catch (err) {
      console.error("[AtlasAI Document] PDF/TXT read failed", {
        id: normalized.id,
        name: normalized.name,
        error: err,
      });
      setError("Bu dokümanın içeriği şu anda okunamıyor. Lütfen desteklenen formatlarda (PDF, PPTX, DOCX, TXT, resim) bir doküman seçin.");
    }
  }, [pendingAttachments]);

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => {
      const removedId = prev[index]?.id;
      if (removedId) {
        setPendingDocumentContexts((contexts) =>
          contexts.filter((context) => context.id !== removedId)
        );
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const sendLessonMessage = useCallback(
    async (
      rawPrompt: string,
      options: { preserveQuiz?: boolean } = {}
    ) => {
      const prompt = rawPrompt.trim();
      if (!prompt || authLoading || !uid || isSending) return;
      if (!options.preserveQuiz) resetQuizState();

      let chatId = activeChatId;
      let persistedChatId: string | null = activeChatId;
      const attachmentSnapshot = [...pendingAttachments];
      const pendingTexts = pendingDocumentContexts
        .map((context) => context.text)
        .filter((text): text is string => Boolean(text));
      const fileContext = pendingTexts.length
        ? `\n\n[Yüklenen doküman içeriği]\n${pendingTexts.join("\n\n")}`
        : "";
      const fullUserText = prompt + fileContext;
      const documentPartsSnapshot = pendingDocumentContexts
        .map((context) => context.part)
        .filter((part): part is GeminiPart => Boolean(part));

      setPendingAttachments([]);
      setPendingDocumentContexts([]);
      setIsSending(true);
      setStreamingContent("");
      setError(null);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        if (!chatId) {
          try {
            chatId = await createChat(
              uid,
              selectedModel,
              titleFromMessage(prompt),
              "lesson"
            );
            persistedChatId = chatId;
            setActiveChatId(chatId);
            setChats((prev) => [
              {
                id: chatId!,
                title: titleFromMessage(prompt),
                model: selectedModel,
                mode: "lesson",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              ...prev,
            ]);
          } catch (err) {
            console.error("[useAiChat] createChat:", err);
            setError("Sohbet kaydedilemedi, yanıt yine oluşturulacak.");
            chatId = `local-${Date.now()}`;
            persistedChatId = null;
          }
        } else {
          try {
            await updateChatMeta(uid, chatId, { model: selectedModel, mode: "lesson" });
          } catch (err) {
            console.error("[useAiChat] updateChatMeta:", err);
            setError("Sohbet bilgisi kaydedilemedi, yanıt yine oluşturulacak.");
          }
        }

        let userMsgId = `local-user-${Date.now()}`;
        if (persistedChatId) {
          try {
            userMsgId = await saveMessage(
              uid,
              persistedChatId,
              "user",
              prompt,
              attachmentSnapshot.length ? attachmentSnapshot : undefined
            );
          } catch (err) {
            console.error("[useAiChat] save user message:", err);
            setError("Mesaj kaydedilemedi, yanıt yine oluşturulacak.");
          }
        }

        const userMsg: AiChatMessage = {
          id: userMsgId,
          role: "user",
          content: prompt,
          createdAt: new Date(),
          attachments: attachmentSnapshot.length ? attachmentSnapshot : undefined,
        };
        setMessages((prev) => [...prev, userMsg]);

        const history: GeminiContentPart[] = [
          ...messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
          })),
          { role: "user" as const, parts: [{ text: fullUserText }, ...documentPartsSnapshot] },
        ];

        let fullReply = "";
        for await (const chunk of streamGeminiChat(
          selectedModel,
          history,
          buildLessonSystemInstruction(),
          abortRef.current.signal
        )) {
          fullReply += chunk;
          setStreamingContent(fullReply);
        }

        let modelMsgId = `local-model-${Date.now()}`;
        if (persistedChatId) {
          try {
            modelMsgId = await saveMessage(uid, persistedChatId, "model", fullReply);
          } catch (err) {
            console.error("[useAiChat] save model message:", err);
            setError("AI yanıtı kaydedilemedi.");
          }
        }
        const modelMsg: AiChatMessage = {
          id: modelMsgId,
          role: "model",
          content: fullReply,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, modelMsg]);
        setStreamingContent("");

        setChats((prev) =>
          prev.map((c) =>
            c.id === persistedChatId
              ? { ...c, updatedAt: new Date(), model: selectedModel }
              : c
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[useAiChat] sendLessonMessage:", err);
        setError(err instanceof Error ? err.message : "Mesaj gönderilemedi.");
        setStreamingContent("");
      } finally {
        setIsSending(false);
      }
    },
    [
      uid,
      authLoading,
      activeChatId,
      isSending,
      messages,
      pendingAttachments,
      pendingDocumentContexts,
      resetQuizState,
      selectedModel,
    ]
  );

  const sendTestMessage = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || authLoading || !uid || isSending) return;

      const attachmentSnapshot = [...pendingAttachments];
      const pendingTexts = pendingDocumentContexts
        .map((context) => context.text)
        .filter((text): text is string => Boolean(text));
      const documentContext = pendingTexts.join("\n\n");
      const documentPartsSnapshot = pendingDocumentContexts
        .map((context) => context.part)
        .filter((part): part is GeminiPart => Boolean(part));
      const sourceType: QuizSourceType = attachmentSnapshot.length
        ? "document"
        : "general";
      const activeDocument = attachmentSnapshot[0] ?? null;
      const documentId = sourceType === "document" ? activeDocument?.id ?? null : null;
      const documentTitle =
        sourceType === "document" ? activeDocument?.name ?? null : null;

      if (
        sourceType === "document" &&
        !documentContext.trim() &&
        documentPartsSnapshot.length === 0
      ) {
        setError(
          "Seçili dokümanın okunabilir içeriği bulunamadı. Lütfen metni çıkarılmış bir doküman seçin."
        );
        return;
      }

      let chatId = activeChatId;
      let persistedChatId: string | null = activeChatId;

      resetQuizState();
      setLastTestPrompt(prompt);
      setActiveQuizDocumentTitle(documentTitle);
      setActiveQuizContext({
        prompt,
        documentId,
        documentTitle,
        documentType: activeDocument?.type ?? activeDocument?.name?.split(".").pop() ?? null,
        questionCount: 0,
        assistantMessage: "Sorular hazırlanıyor...",
        createdAt: new Date(),
      });
      setPendingAttachments([]);
      setPendingDocumentContexts([]);
      setIsSending(true);
      setStreamingContent("");
      setError(null);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        if (!chatId) {
          try {
            chatId = await createChat(
              uid,
              selectedModel,
              titleFromMessage(prompt),
              "test"
            );
            persistedChatId = chatId;
            setActiveChatId(chatId);
            setChats((prev) => [
              {
                id: chatId!,
                title: titleFromMessage(prompt),
                model: selectedModel,
                mode: "test",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              ...prev,
            ]);
          } catch (err) {
            console.error("[useAiChat] create test chat:", err);
            setError("Sohbet kaydedilemedi, test yine oluşturulacak.");
            chatId = `local-${Date.now()}`;
            persistedChatId = null;
          }
        } else {
          try {
            await updateChatMeta(uid, chatId, { model: selectedModel, mode: "test" });
          } catch (err) {
            console.error("[useAiChat] update test chat meta:", err);
            setError("Sohbet bilgisi kaydedilemedi, test yine oluşturulacak.");
          }
        }

        let userMsgId = `local-user-${Date.now()}`;
        if (persistedChatId) {
          try {
            userMsgId = await saveMessage(
              uid,
              persistedChatId,
              "user",
              prompt,
              attachmentSnapshot.length ? attachmentSnapshot : undefined
            );
          } catch (err) {
            console.error("[useAiChat] save test user message:", err);
            setError("Mesaj kaydedilemedi, test yine oluşturulacak.");
          }
        }

        const userMsg: AiChatMessage = {
          id: userMsgId,
          role: "user",
          content: prompt,
          createdAt: new Date(),
          attachments: attachmentSnapshot.length ? attachmentSnapshot : undefined,
        };
        setMessages((prev) => [...prev, userMsg]);

        const testPrompt = buildTestUserPrompt({
          userPrompt: prompt,
          sourceType,
          documentId,
          documentTitle,
          documentContext,
        });

        const rawReply = await generateGeminiContent(
          selectedModel,
          [
            {
              role: "user",
              parts: [{ text: testPrompt }, ...documentPartsSnapshot],
            },
          ],
          buildTestSystemInstruction(),
          abortRef.current.signal,
          { responseMimeType: "application/json" }
        );

        const parsedQuiz = parseQuizResponse(rawReply);
        const quiz: QuizPayload = {
          ...parsedQuiz,
          sourceType,
          documentId,
        };
        const quizContext: QuizContextInfo = {
          prompt,
          documentId,
          documentTitle,
          documentType: activeDocument?.type ?? activeDocument?.name?.split(".").pop() ?? null,
          questionCount: quiz.questions.length,
          assistantMessage: buildQuizContextMessage(documentTitle, quiz.questions.length),
          createdAt: new Date(),
        };

        setActiveQuiz(quiz);
        setLastTestPrompt(prompt);
        setCurrentQuestionIndex(0);
        setQuizAnswers({});
        setQuizResult(null);
        setActiveQuizContext(quizContext);
        setActiveQuizDocumentTitle(documentTitle);
        setQuizSaveStatus("idle");
        setQuizSaveError(null);
        quizSaveRef.current = null;

        const summary =
          quiz.questions.length > 0
            ? `Test oluşturuldu: ${quiz.title} (${quiz.questions.length} soru)`
            : `Test oluşturulamadı: ${quiz.title}`;

        let modelMsgId = `local-model-${Date.now()}`;
        if (persistedChatId) {
          try {
            modelMsgId = await saveMessage(
              uid,
              persistedChatId,
              "model",
              summary,
              undefined,
              {
                chatMode: "test",
                quiz,
                quizContext,
              }
            );
          } catch (err) {
            console.error("[useAiChat] save test summary:", err);
          }
        }

        const modelMsg: AiChatMessage = {
          id: modelMsgId,
          role: "model",
          content: summary,
          createdAt: new Date(),
          metadata: {
            chatMode: "test",
            quiz,
            quizContext,
          },
        };
        setMessages((prev) => [...prev, modelMsg]);

        setChats((prev) =>
          prev.map((c) =>
            c.id === persistedChatId
              ? { ...c, updatedAt: new Date(), model: selectedModel }
              : c
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[useAiChat] sendTestMessage:", err);
        setActiveQuiz(null);
        setError("Test soruları oluşturulamadı. Lütfen tekrar deneyin.");
      } finally {
        setIsSending(false);
      }
    },
    [
      activeChatId,
      authLoading,
      isSending,
      pendingAttachments,
      pendingDocumentContexts,
      resetQuizState,
      selectedModel,
      uid,
    ]
  );

  const saveQuizResult = useCallback(
    async (result: QuizResult) => {
      if (!activeQuiz) return;

      if (!uid) {
        setQuizSaveStatus("error");
        setQuizSaveError("Test sonucu kaydedilemedi. Lütfen tekrar giriş yapın.");
        return;
      }

      if (quizSaveRef.current) return;

      quizSaveRef.current = "saving";
      setQuizSaveStatus("saving");
      setQuizSaveError(null);

      try {
        const attemptId = await saveQuizAttempt({
          userId: uid,
          documentId: activeQuiz.documentId,
          documentTitle: activeQuizDocumentTitle,
          sourceType: activeQuiz.sourceType,
          title: activeQuiz.title,
          result,
        });
        quizSaveRef.current = attemptId;
        setQuizSaveStatus("saved");
        window.dispatchEvent(
          new CustomEvent("atlasai:quiz-result-saved", {
            detail: {
              userId: uid,
              documentId: activeQuiz.documentId,
              resultSummary: result,
            },
          })
        );
      } catch (err) {
        console.error("[useAiChat] saveQuizResult:", err);
        quizSaveRef.current = null;
        setQuizSaveStatus("error");
        setQuizSaveError(
          "Test sonucunuz hesaplandı ancak kaydedilemedi. Lütfen bağlantı veya izin ayarlarını kontrol edin."
        );
      }
    },
    [activeQuiz, activeQuizDocumentTitle, uid]
  );

  const answerQuizQuestion = useCallback(
    (questionId: string, selectedOptionId: string) => {
      if (quizResult) return;
      setQuizAnswers((current) => {
        if (Object.prototype.hasOwnProperty.call(current, questionId)) return current;
        return {
          ...current,
          [questionId]: selectedOptionId,
        };
      });
    },
    [quizResult]
  );

  const finishQuiz = useCallback(() => {
    if (!activeQuiz || quizSaveStatus === "saving" || quizSaveStatus === "saved") return;

    const result = quizResult ?? calculateQuizResult(activeQuiz.questions, quizAnswers);
    if (!quizResult) setQuizResult(result);
    void saveQuizResult(result);
  }, [activeQuiz, quizAnswers, quizResult, quizSaveStatus, saveQuizResult]);

  const askQuizQuestion = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;
      await sendLessonMessage(prompt, { preserveQuiz: true });
    },
    [sendLessonMessage]
  );

  const sendMessage = useCallback(
    async (rawPrompt: string) => {
      if (chatMode === "test") {
        await sendTestMessage(rawPrompt);
        return;
      }

      await sendLessonMessage(rawPrompt);
    },
    [chatMode, sendLessonMessage, sendTestMessage]
  );

  return {
    chats,
    activeChatId,
    messages,
    selectedModel,
    setSelectedModel,
    chatMode,
    setChatMode,
    isChatModeLocked,
    lastTestPrompt,
    activeQuiz,
    activeQuizContext,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    quizAnswers,
    answerQuizQuestion,
    quizResult,
    isQuizFinished: Boolean(quizResult),
    quizSaveStatus,
    quizSaveError,
    isSavingQuizResult: quizSaveStatus === "saving",
    hasSavedQuizResult: quizSaveStatus === "saved",
    saveQuizResult,
    finishQuiz,
    askQuizQuestion,
    quizContextMessage: activeQuizContext?.assistantMessage ?? "",
    clearQuiz: resetQuizState,
    isLoadingChats,
    isLoadingMessages,
    deletingChatId,
    isSending,
    streamingContent,
    error,
    setError,
    pendingAttachments,
    availableDocuments,
    isLoadingDocuments,
    selectChat,
    startNewChat,
    deleteChat,
    sendMessage,
    addDocumentAttachment,
    removeAttachment,
    loadChats,
  };
}
