import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { fetchAndAnalyzeMentorship } from "../services/mentorship.service";
import type { MentorAnalysisResult, MentorAnalysisStatus } from "../types/mentorship.types";

export function useMentorshipAnalysis() {
  const { user } = useAuth();
  const [result, setResult] = useState<MentorAnalysisResult | null>(null);
  const [status, setStatus] = useState<MentorAnalysisStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isForceRefresh, setIsForceRefresh] = useState(false);

  const refresh = useCallback((force = true) => {
    setIsForceRefresh(force);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const handleQuizSaved = () => refresh(false); // Yeni quiz kaydedildiğinde cache geçerli olmayacağı için force yapmaya gerek yok, lastQuizAt değişmiş olacak.
    window.addEventListener("atlasai:quiz-result-saved", handleQuizSaved);
    return () => window.removeEventListener("atlasai:quiz-result-saved", handleQuizSaved);
  }, [refresh]);

  useEffect(() => {
    if (!user) {
        const t = window.setTimeout(() => setStatus("idle"), 0);
        return () => window.clearTimeout(t);
    }

    let cancelled = false;

    const run = async () => {
        const timeoutId = window.setTimeout(() => {
           if (!cancelled) setStatus("loading");
        }, 0);

        try {
            const analysis = await fetchAndAnalyzeMentorship(user.uid, isForceRefresh);
            if (!cancelled) {
                setResult(analysis);
                setStatus("success");
                setError(null);
            }
        } catch (err) {
            console.error("[useMentorshipAnalysis] Error:", err);
            if (!cancelled) {
                setError("Mentorluk analiz verileri alınırken bir hata oluştu.");
                setStatus("error");
            }
        } finally {
            if (!cancelled) {
               window.clearTimeout(timeoutId);
            }
        }
    };

    run();

    return () => {
        cancelled = true;
    };
  }, [user, refreshKey, isForceRefresh]);

  return {
      result,
      status,
      error,
      refresh
  };
}
