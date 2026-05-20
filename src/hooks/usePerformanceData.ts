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
      const timeoutId = window.setTimeout(() => {
        setData(getEmptyPerformanceData());
        setLoading(false);
        setError(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    let cancelled = false;
    const stateTimeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setError(false);
      }
    }, 0);

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
      window.clearTimeout(stateTimeoutId);
    };
  }, [user?.uid, refreshKey]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
