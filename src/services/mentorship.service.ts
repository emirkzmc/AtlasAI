import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  orderBy,
  limit,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { app } from "./firebase.config";
import { generateGeminiContent } from "./gemini.service";
import {
  MENTOR_SYSTEM_INSTRUCTION,
  MAX_WRONG_ANSWERS_PER_DOC,
  MAX_RECENT_QUIZZES,
} from "../constants/mentorship.constants";
import type {
  MentorAnalysisInput,
  MentorAnalysisResult,
  CachedMentorAnalysis,
  MentorInsight,
  MentorCard,
  MentorPriority,
} from "../types/mentorship.types";

const db = getFirestore(app);

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────

function getPriority(successRate: number): MentorPriority {
  if (successRate < 50) return "Kritik Öncelik";
  if (successRate < 75) return "Orta Öncelik";
  return "Düşük Öncelik";
}

function safePercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ─── Veri Çekme (Firestore) ──────────────────────────────────────────────────

async function fetchRawMentorshipData(uid: string): Promise<MentorAnalysisInput[]> {
  const inputsMap = new Map<string, MentorAnalysisInput>();

  // 1. Dokümanları çek (documentStats üzerinden başarı oranları vs)
  const docsRef = collection(db, "users", uid, "documents");
  const docsSnap = await getDocs(docsRef);
  
  docsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const answered = data.answeredQuestions ?? 0;
    const correct = data.correctAnswers ?? 0;
    const wrong = data.wrongAnswers ?? 0;
    const successRate = data.successRate ?? safePercent(correct, answered);
    
    // Yalnızca soru çözülmüş belgeleri al
    if (answered > 0) {
      inputsMap.set(docSnap.id, {
        documentTitle: data.name ?? "Bilinmeyen Doküman",
        successRate,
        totalCorrect: correct,
        totalWrong: wrong,
        recentWrongAnswers: [],
        explanations: [],
        recentQuizResults: [],
        trendAnalysis: {
          direction: "stable",
          recentRate: successRate,
          previousRate: successRate,
        },
      });
    }
  });

  // 2. Yanlış Cevapları çek
  const wrongRef = collection(db, "users", uid, "wrongAnswers");
  const wrongSnap = await getDocs(query(wrongRef, orderBy("createdAt", "desc"), limit(50)));
  
  wrongSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const docId = data.documentId;
    if (docId && inputsMap.has(docId)) {
      const input = inputsMap.get(docId)!;
      if (input.recentWrongAnswers.length < MAX_WRONG_ANSWERS_PER_DOC) {
        input.recentWrongAnswers.push({
          question: data.question ?? "",
          userAnswer: data.userAnswer ?? "",
          correctAnswer: data.correctAnswer ?? "",
          explanation: data.explanation ?? "",
        });
        if (data.explanation && !input.explanations.includes(data.explanation)) {
            input.explanations.push(data.explanation);
        }
      }
    }
  });

  // 3. Son quizleri çek
  const attemptsRef = collection(db, "users", uid, "quizAttempts");
  const attemptsSnap = await getDocs(query(attemptsRef, orderBy("createdAt", "desc"), limit(MAX_RECENT_QUIZZES)));
  
  attemptsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const docId = data.documentId;
    if (docId && inputsMap.has(docId)) {
       const input = inputsMap.get(docId)!;
       const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
       input.recentQuizResults.push({
         title: data.title ?? "Quiz",
         successRate: data.successRate ?? 0,
         correctCount: data.correctCount ?? 0,
         wrongCount: data.wrongCount ?? 0,
         blankCount: data.blankCount ?? 0,
         totalQuestions: data.totalQuestions ?? 0,
         createdAt
       });
    }
  });

  // 4. Son quizlerden basit trend analizi yap (Belge bazlı)
  inputsMap.forEach((input) => {
      if (input.recentQuizResults.length >= 2) {
          // Quizler yeniden eskiye sıralı geldiği için index 0 en son quiz
          const recent = input.recentQuizResults[0].successRate;
          const previous = input.recentQuizResults[1].successRate;
          input.trendAnalysis.recentRate = recent;
          input.trendAnalysis.previousRate = previous;
          
          if (recent > previous + 5) input.trendAnalysis.direction = "improving";
          else if (recent < previous - 5) input.trendAnalysis.direction = "declining";
          else input.trendAnalysis.direction = "stable";
      }
  });

  return Array.from(inputsMap.values());
}

// ─── Gemini ile Analiz ───────────────────────────────────────────────────────

async function getGeminiAnalysis(inputs: MentorAnalysisInput[]): Promise<MentorAnalysisResult> {
  if (inputs.length === 0) {
    throw new Error("Analiz edilecek veri bulunamadı.");
  }

  const prompt = JSON.stringify(inputs, null, 2);

  const responseText = await generateGeminiContent(
    "gemini-2.5-flash",
    [{ role: "user", parts: [{ text: prompt }] }],
    MENTOR_SYSTEM_INSTRUCTION,
    undefined,
    { responseMimeType: "application/json" }
  );

  try {
    const parsed = JSON.parse(responseText) as MentorAnalysisResult;
    if (!parsed.insight || !parsed.cards) {
       throw new Error("AI yanıtı beklenen formatta değil");
    }
    return parsed;
  } catch (error) {
    console.error("[getGeminiAnalysis] JSON parse error:", error, responseText);
    throw new Error("AI analiz sonucu çözümlenemedi.");
  }
}

// ─── Fallback (AI Çalışmazsa) ────────────────────────────────────────────────

function buildFallbackAnalysis(inputs: MentorAnalysisInput[]): MentorAnalysisResult {
    let totalWrong = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    let bestDoc = inputs[0];
    let worstDoc = inputs[0];

    const cards: MentorCard[] = inputs.map(input => {
        totalWrong += input.totalWrong;
        totalCorrect += input.totalCorrect;
        totalQuestions += (input.totalCorrect + input.totalWrong);

        if (input.successRate > bestDoc.successRate) bestDoc = input;
        if (input.successRate < worstDoc.successRate) worstDoc = input;

        return {
            title: input.documentTitle,
            priority: getPriority(input.successRate),
            summary: `${input.documentTitle} belgesinde başarı oranınız %${input.successRate}. Toplam ${input.totalWrong} yanlışınız bulunuyor.`,
            recommendation: "Yanlış yaptığınız konuların açıklamalarını tekrar okumanız faydalı olacaktır.",
            successRate: input.successRate
        };
    });

    const overallSuccess = safePercent(totalCorrect, totalQuestions);

    const insight: MentorInsight = {
        overallMessage: "Öğrenme yolculuğuna devam ediyorsun. Bazı konularda pratik yaparak eksiklerini giderebilirsin.",
        strongestArea: bestDoc?.documentTitle ?? null,
        weakestArea: worstDoc?.documentTitle ?? null,
        totalWrongCount: totalWrong,
        overallSuccessRate: overallSuccess
    };

    return { insight, cards: cards.sort((a,b) => a.successRate - b.successRate) }; // En düşük success rate en üstte
}

// ─── Ana Dışa Açılan Fonksiyon (Cache Mekanizmalı) ───────────────────────────

export async function fetchAndAnalyzeMentorship(uid: string, forceRefresh: boolean = false): Promise<MentorAnalysisResult> {
    const statsDocRef = doc(db, "users", uid, "stats", "main");
    const mentorCacheRef = doc(db, "users", uid, "stats", "mentorship");

    const [statsSnap, cacheSnap] = await Promise.all([
        getDoc(statsDocRef),
        getDoc(mentorCacheRef)
    ]);

    const statsData = statsSnap.exists() ? statsSnap.data() : null;
    let currentLastQuizAt = "";
    
    if (statsData?.lastQuizAt) {
        currentLastQuizAt = statsData.lastQuizAt instanceof Timestamp 
            ? statsData.lastQuizAt.toDate().toISOString() 
            : String(statsData.lastQuizAt);
    }

    const cacheData = cacheSnap.exists() ? (cacheSnap.data() as CachedMentorAnalysis) : null;

    // Cache geçerliyse ve forceRefresh istenmemişse cache dön
    if (!forceRefresh && cacheData && cacheData.result) {
        if (cacheData.lastQuizDate === currentLastQuizAt) {
            console.log("[MentorshipService] Returning cached analysis");
            return cacheData.result;
        }
    }

    console.log("[MentorshipService] Fetching new data for analysis...");
    
    // Verileri topla
    const inputs = await fetchRawMentorshipData(uid);
    
    if (inputs.length === 0) {
        // Kullanıcı hiç test çözmemişse boş döneceğiz
        const emptyResult: MentorAnalysisResult = {
             insight: { overallMessage: "Henüz veri yok", strongestArea: null, weakestArea: null, totalWrongCount: 0, overallSuccessRate: 0 },
             cards: []
        };
        return emptyResult;
    }

    let result: MentorAnalysisResult;

    try {
        result = await getGeminiAnalysis(inputs);
        // AI kartlarını başarı oranına göre sıralayalım (en düşük en üstte)
        result.cards.sort((a, b) => a.successRate - b.successRate);
    } catch (err) {
        console.error("[MentorshipService] Gemini error, using fallback.", err);
        result = buildFallbackAnalysis(inputs);
    }

    // Cache'i güncelle
    try {
        await setDoc(mentorCacheRef, {
            result,
            lastQuizDate: currentLastQuizAt,
            updatedAt: serverTimestamp()
        });
    } catch (err) {
        console.error("[MentorshipService] Failed to save cache", err);
    }

    return result;
}
