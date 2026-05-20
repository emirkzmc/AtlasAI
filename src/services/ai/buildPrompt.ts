import { ATLAS_AI_SYSTEM_INSTRUCTION } from "../../constants/aiChat.constants";
import type { QuizSourceType } from "../../types/quiz.types";

interface BuildTestPromptInput {
  userPrompt: string;
  sourceType: QuizSourceType;
  documentId: string | null;
  documentTitle: string | null;
  documentContext: string;
}

export function buildLessonSystemInstruction(): string {
  return ATLAS_AI_SYSTEM_INSTRUCTION;
}

export function buildTestSystemInstruction(): string {
  return [
    "Sen AtlasAI'nin test üretme modusun.",
    "Kullanıcı her mesaj gönderdiğinde sadece çoktan seçmeli test soruları üret.",
    "Normal sohbet cevabı verme.",
    "Çıktın sadece geçerli JSON olmalı.",
    "Markdown, açıklama yazısı veya JSON dışı metin yazma.",
    "Eğer doküman bağlamı verildiyse sadece dokümandaki bilgilerden soru üret.",
    "Dokümanda olmayan bilgiyi uydurma.",
    "Doküman yetersizse questions dizisini az sayıda üret veya boş döndür; ayrıca title içinde 'Doküman içeriği yetersiz' gibi kısa bilgi ver.",
    "Sorular öğrencinin öğrenmesini ölçmeye yönelik olmalı.",
    "Aynı şıklar tekrar etmemeli.",
    "Doğru cevap açıkça tek bir şık olmalı.",
    "Gerekiyorsa kullanıcının promptuna göre soru sayısını belirle; belirtilmediyse varsayılan 5 soru üret.",
    "Her soruda tam 4 şık olmalı.",
    "correctOptionId mutlaka options içindeki id değerlerinden biri olmalı.",
    "Soru metni ve şık metinleri boş olmamalı.",
    "Açıklama kısa ve anlaşılır olmalı.",
    "JSON şeman tam olarak şu formatta olmalı:",
    JSON.stringify(
      {
        mode: "test",
        title: "Kısa test başlığı",
        sourceType: "document | general",
        documentId: "aktif doküman id veya null",
        questions: [
          {
            id: "q1",
            question: "Soru metni",
            options: [
              { id: "A", text: "Şık A" },
              { id: "B", text: "Şık B" },
              { id: "C", text: "Şık C" },
              { id: "D", text: "Şık D" },
            ],
            correctOptionId: "A",
            explanation: "Doğru cevabın kısa açıklaması",
            difficulty: "easy | medium | hard",
            documentReference: "Varsa dokümandaki ilgili kısa konu/paragraf özeti",
          },
        ],
      },
      null,
      2
    ),
  ].join("\n");
}

export function buildTestUserPrompt({
  userPrompt,
  sourceType,
  documentId,
  documentTitle,
  documentContext,
}: BuildTestPromptInput): string {
  const base = [
    "[Kullanıcı talebi]",
    userPrompt.trim(),
    "",
    "[Test üretim bilgisi]",
    `sourceType: ${sourceType}`,
    `documentId: ${documentId ?? "null"}`,
    `documentTitle: ${documentTitle ?? "null"}`,
  ];

  if (sourceType === "document") {
    base.push(
      "",
      "[Kesin doküman kuralı]",
      "Sadece verilen doküman içeriğinden soru üret. Dokümanda açıkça bulunmayan konulardan soru üretme. Yetersiz içerik varsa bunu belirt ve daha az soru üret.",
      "",
      "[Doküman içeriği]",
      documentContext.trim()
    );
  }

  return base.join("\n");
}
