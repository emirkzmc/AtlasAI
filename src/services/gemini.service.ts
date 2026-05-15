import type { GeminiModelId } from "../types/aiChat.types";

/**
 * NOT: Vite yalnızca VITE_ önekli env değişkenlerini istemciye aktarır.
 * Backend/proxy yoksa demo için VITE_GEMINI_API_KEY kullanılır — üretimde anahtarı
 * sunucu tarafında tutmak gerekir.
 */
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiContentPart {
  role: "user" | "model";
  parts: { text: string }[];
}

function assertApiKey(): string {
  if (!GEMINI_API_KEY?.trim()) {
    throw new Error(
      "Gemini API anahtarı bulunamadı. .env dosyasına VITE_GEMINI_API_KEY ekleyin."
    );
  }
  return GEMINI_API_KEY.trim();
}

function parseGeminiError(status: number, body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string } };
    if (json.error?.message) return json.error.message;
  } catch {
    /* ignore */
  }
  if (status === 429) return "Çok fazla istek gönderildi. Lütfen biraz bekleyin.";
  if (status === 403) return "API anahtarı geçersiz veya yetkisiz.";
  return `Gemini API hatası (${status}).`;
}

/**
 * Streaming yanıt — her chunk için metin parçası döner.
 */
export async function* streamGeminiChat(
  model: GeminiModelId,
  contents: GeminiContentPart[],
  signal?: AbortSignal
): AsyncGenerator<string> {
  const key = assertApiKey();
  const url = `${BASE_URL}/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[streamGeminiChat] API error:", res.status, errText);
    throw new Error(parseGeminiError(res.status, errText));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Akış okunamadı.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}
