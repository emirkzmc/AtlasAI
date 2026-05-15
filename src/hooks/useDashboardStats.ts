import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  getDashboardStats,
  getDocumentStats,
  getTotalDocuments,
  getLast7DaysActivity,
  ensureTodayActivityAndStreak,
  fetchRecentDocuments,
  type DashboardStats,
  type DocumentStat,
  type ActivityDay,
} from "../services/dashboard.service";
import type { IDocument } from "../components/docs/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardData {
  // Stats card
  stats: DashboardStats | null;
  statsLoading: boolean;
  statsError: boolean;

  // Document success distribution
  documentStats: DocumentStat[];
  documentsLoading: boolean;

  // Activity chart
  activityDays: ActivityDay[];
  activityLoading: boolean;

  // Recent documents
  recentDocuments: IDocument[];
  recentDocsLoading: boolean;

  // Total document count (stat card)
  totalDocuments: number;
  totalDocumentsLoading: boolean;

  refresh: () => void;
}

// ─── Fallback: 7 empty days for the chart when activity load fails ────────────

function buildEmpty7Days(): ActivityDay[] {
  const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cts"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateKey: d.toISOString().split("T")[0],
      label: dayNames[d.getDay()],
      activeCount: 0,
    };
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboardStats(): DashboardData {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // Document distribution
  const [documentStats, setDocumentStats] = useState<DocumentStat[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  // Activity chart
  const [activityDays, setActivityDays] = useState<ActivityDay[]>(buildEmpty7Days());
  const [activityLoading, setActivityLoading] = useState(true);

  // Recent docs
  const [recentDocuments, setRecentDocuments] = useState<IDocument[]>([]);
  const [recentDocsLoading, setRecentDocsLoading] = useState(true);

  // Total doc count
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalDocumentsLoading, setTotalDocumentsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Not authenticated – clear all loading states immediately
      setStatsLoading(false);
      setDocumentsLoading(false);
      setActivityLoading(false);
      setRecentDocsLoading(false);
      setTotalDocumentsLoading(false);
      return;
    }

    let cancelled = false;
    const uid = user.uid;

    // Reset all loading flags
    setStatsLoading(true);
    setStatsError(false);
    setDocumentsLoading(true);
    setActivityLoading(true);
    setRecentDocsLoading(true);
    setTotalDocumentsLoading(true);

    // ── Ensure today's activity (non-blocking, doesn't gate other queries) ──
    ensureTodayActivityAndStreak(uid).catch((e) => {
      console.error("[useDashboardStats] ensureTodayActivityAndStreak failed:", e);
    });

    // ── Stats (Genel Başarı + Çözülen Sorular + Çalışma Serisi) ─────────────
    getDashboardStats(uid)
      .then((s) => {
        if (!cancelled) {
          setStats(s);
          setStatsError(false);
        }
      })
      .catch((e) => {
        console.error("[useDashboardStats] getDashboardStats failed:", e);
        if (!cancelled) setStatsError(true);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    // ── Document success distribution ────────────────────────────────────────
    getDocumentStats(uid, 4)
      .then((d) => {
        if (!cancelled) setDocumentStats(d);
      })
      .catch((e) => {
        console.error("[useDashboardStats] getDocumentStats failed:", e);
        if (!cancelled) setDocumentStats([]);
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    // ── Activity chart ───────────────────────────────────────────────────────
    getLast7DaysActivity(uid)
      .then((a) => {
        if (!cancelled) setActivityDays(a);
      })
      .catch((e) => {
        console.error("[useDashboardStats] getLast7DaysActivity failed:", e);
        if (!cancelled) setActivityDays(buildEmpty7Days());
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    // ── Recent documents ─────────────────────────────────────────────────────
    fetchRecentDocuments(uid, 5)
      .then((r) => {
        if (!cancelled) setRecentDocuments(r);
      })
      .catch((e) => {
        console.error("[useDashboardStats] fetchRecentDocuments failed:", e);
        if (!cancelled) setRecentDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setRecentDocsLoading(false);
      });

    // ── Total document count ─────────────────────────────────────────────────
    getTotalDocuments(uid)
      .then((t) => {
        if (!cancelled) setTotalDocuments(t);
      })
      .catch((e) => {
        console.error("[useDashboardStats] getTotalDocuments failed:", e);
        if (!cancelled) setTotalDocuments(0);
      })
      .finally(() => {
        if (!cancelled) setTotalDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  return {
    stats,
    statsLoading,
    statsError,
    documentStats,
    documentsLoading,
    activityDays,
    activityLoading,
    recentDocuments,
    recentDocsLoading,
    totalDocuments,
    totalDocumentsLoading,
    refresh,
  };
}
