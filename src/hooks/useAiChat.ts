import { useCallback, useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { getDownloadURL, getStorage, ref as storageRef } from "firebase/storage";
import { useAuth } from "./useAuth";
import { DEFAULT_GEMINI_MODEL } from "../constants/aiChat.constants";
import {
  AI_CHAT_MAX_FILE_BYTES,
  ATLAS_AI_SYSTEM_INSTRUCTION,
} from "../constants/aiChat.constants";
import type {
  AiChatMessage,
  AiChatSummary,
  ChatAttachmentMeta,
  GeminiModelId,
} from "../types/aiChat.types";
import {
  createChat,
  deleteChat as deleteStoredChat,
  fetchChatMessages,
  fetchUserChats,
  saveMessage,
  titleFromMessage,
  updateChatMeta,
} from "../services/aiChat.service";
import { app } from "../services/firebase.config";
import { streamGeminiChat, type GeminiContentPart, type GeminiPart } from "../services/gemini.service";
import { fetchDocuments } from "../services/docs.service";
import type { IDocument } from "../components/docs/types";

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
}

const storage = getStorage(app);

function getDocumentExtension(documentName: string): string {
  return documentName.split(".").pop()?.toLowerCase() ?? "";
}

function getDocumentMimeType(documentName: string, document: IDocument): string {
  const ext = getDocumentExtension(documentName);
  if (document.mimeType) return document.mimeType;
  if (document.type) return document.type;
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
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
  };
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

  const loadChats = useCallback(async () => {
    if (authLoading || !uid) return;
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
    if (isOpen && !authLoading && uid) void loadChats();
  }, [isOpen, authLoading, uid, loadChats]);

  const loadDocuments = useCallback(async () => {
    if (authLoading || !uid) return;
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
    if (isOpen && !authLoading && uid) void loadDocuments();
  }, [isOpen, authLoading, uid, loadDocuments]);

  const loadMessages = useCallback(
    async (chatId: string) => {
      if (authLoading || !uid) return;
      setIsLoadingMessages(true);
      setError(null);
      try {
        const msgs = await fetchChatMessages(uid, chatId);
        setMessages(msgs);
        const chat = chats.find((c) => c.id === chatId);
        if (chat) setSelectedModel(chat.model);
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
      void loadMessages(chatId);
    },
    [loadMessages]
  );

  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setStreamingContent("");
    setPendingAttachments([]);
    setPendingDocumentContexts([]);
    setError(null);
  }, []);

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
        }
      } catch (err) {
        console.error("[useAiChat] deleteChat:", err);
        setError(err instanceof Error ? err.message : "Sohbet silinemedi.");
      } finally {
        setDeletingChatId(null);
      }
    },
    [activeChatId, authLoading, deletingChatId, uid]
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

    if (!normalized.isTxt && !normalized.isPdf) {
      console.warn("[AtlasAI Document] Unsupported readable type", normalized);
      setError("Bu dokümanın içeriği şu anda okunamıyor. Lütfen TXT veya PDF formatında bir doküman seçin.");
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
        const base64 = await arrayBufferToBase64(await response.arrayBuffer());
        setPendingDocumentContexts((prev) => [
          ...prev,
          {
            id: normalized.id,
            part: { inlineData: { mimeType: "application/pdf", data: base64 } },
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
      setError("Bu dokümanın içeriği şu anda okunamıyor. Lütfen TXT veya PDF formatında bir doküman seçin.");
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

  const sendMessage = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || authLoading || !uid || isSending) return;

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
            chatId = await createChat(uid, selectedModel, titleFromMessage(prompt));
            persistedChatId = chatId;
            setActiveChatId(chatId);
            setChats((prev) => [
              {
                id: chatId!,
                title: titleFromMessage(prompt),
                model: selectedModel,
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
            await updateChatMeta(uid, chatId, { model: selectedModel });
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
          ATLAS_AI_SYSTEM_INSTRUCTION,
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
        console.error("[useAiChat] sendMessage:", err);
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
      selectedModel,
    ]
  );

  return {
    chats,
    activeChatId,
    messages,
    selectedModel,
    setSelectedModel,
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
