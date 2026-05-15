import { useCallback, useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { useAuth } from "./useAuth";
import { DEFAULT_GEMINI_MODEL } from "../constants/aiChat.constants";
import {
  AI_CHAT_ACCEPTED_FILE_TYPES,
  AI_CHAT_MAX_FILE_BYTES,
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
import { streamGeminiChat, type GeminiContentPart } from "../services/gemini.service";

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
  const [pendingFileTexts, setPendingFileTexts] = useState<string[]>([]);

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
    setPendingFileTexts([]);
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
          setPendingFileTexts([]);
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

  const addAttachment = useCallback(async (file: File) => {
    const allowed = AI_CHAT_ACCEPTED_FILE_TYPES as readonly string[];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const extOk =
      ext &&
      ["pdf", "txt", "docx", "png", "jpg", "jpeg"].includes(ext);
    if (!allowed.includes(file.type) && !extOk) {
      setError("Yalnızca PDF, TXT, DOCX, PNG, JPG veya JPEG dosyaları ekleyebilirsiniz.");
      return;
    }
    if (file.size > AI_CHAT_MAX_FILE_BYTES) {
      setError("Dosya boyutu en fazla 5 MB olabilir.");
      return;
    }

    setError(null);
    const meta: ChatAttachmentMeta = {
      name: file.name,
      type: file.type || ext || "unknown",
      size: file.size,
    };
    setPendingAttachments((prev) => [...prev, meta]);

    if (file.type === "text/plain" || ext === "txt") {
      try {
        const text = await file.text();
        const clipped = text.slice(0, 8000);
        setPendingFileTexts((prev) => [
          ...prev,
          `--- ${file.name} ---\n${clipped}`,
        ]);
      } catch {
        /* TODO: büyük/binary txt parse */
      }
    }
    // TODO: PDF/DOCX/görsel içerik parse — şimdilik yalnızca chip gösterilir
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
    setPendingFileTexts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const sendMessage = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || authLoading || !uid || isSending) return;

      let chatId = activeChatId;
      let persistedChatId: string | null = activeChatId;
      const attachmentSnapshot = [...pendingAttachments];
      const fileContext = pendingFileTexts.length
        ? `\n\n[Ek dosya içeriği]\n${pendingFileTexts.join("\n\n")}`
        : "";
      const fullUserText = prompt + fileContext;

      setPendingAttachments([]);
      setPendingFileTexts([]);
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
          { role: "user" as const, parts: [{ text: fullUserText }] },
        ];

        let fullReply = "";
        for await (const chunk of streamGeminiChat(
          selectedModel,
          history,
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
      pendingFileTexts,
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
    selectChat,
    startNewChat,
    deleteChat,
    sendMessage,
    addAttachment,
    removeAttachment,
    loadChats,
  };
}
