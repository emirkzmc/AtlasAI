import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  fetchPerformanceData,
  getEmptyPerformanceData,
  type PerformanceData,
} from "../services/performance.service";

export function usePerformanceData() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<PerformanceData>(getEmptyPerformanceData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setData(getEmptyPerformanceData());
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchPerformanceData(user.uid)
      .then((performanceData) => {
        if (!cancelled) setData(performanceData);
      })
      .catch((err) => {
        console.error("[usePerformanceData] fetch failed:", err);
        if (!cancelled) {
          setData(getEmptyPerformanceData());
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

  return {
    data,
    loading,
    error,
    refresh,
  };
}
