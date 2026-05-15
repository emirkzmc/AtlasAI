import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import {
  fetchWrongAnswers,
  type WrongAnswerItem,
} from "../services/wrongAnswers.service";

export interface WrongAnswerCategory {
  id: string;
  label: string;
  count: number;
}

export function useWrongAnswers() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [items, setItems] = useState<WrongAnswerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchWrongAnswers(user.uid)
      .then((wrongAnswers) => {
        if (!cancelled) setItems(wrongAnswers);
      })
      .catch((err) => {
        console.error("[useWrongAnswers] fetch failed:", err);
        if (!cancelled) {
          setItems([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, refreshKey]);

  const categories = useMemo<WrongAnswerCategory[]>(() => {
    const counts = new Map<string, number>();

    items.forEach((item) => {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    });

    return [
      { id: "all", label: "Tümü", count: items.length },
      ...Array.from(counts.entries()).map(([label, count]) => ({
        id: label,
        label,
        count,
      })),
    ];
  }, [items]);

  return {
    items,
    categories,
    loading,
    error,
    refresh,
  };
}
