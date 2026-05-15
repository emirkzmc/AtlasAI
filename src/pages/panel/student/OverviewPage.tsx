import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { useDashboardStats } from "../../../hooks/useDashboardStats";
import { deleteDocument } from "../../../services/docs.service";
import StatCard from "../../../components/overview/StatCard";
import DocumentSuccessDistribution from "../../../components/overview/DocumentSuccessDistribution";
import ActivityChart from "../../../components/overview/ActivityChart";
import RecentDocuments from "../../../components/overview/RecentDocuments";

export default function OverviewPage() {
  const { user } = useAuth();

  const {
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
  } = useDashboardStats();

  // ── Display name priority:
  // 1. Firestore firstName + lastName
  // 2. Firestore fullName (also covers auth.displayName fallback set on auto-create)
  // 3. email prefix
  // 4. "Kullanıcı"
  const displayName = (() => {
    const fn = user?.firstName?.trim();
    const ln = user?.lastName?.trim();
    if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
    const full = user?.fullName?.trim();
    if (full) return full;
    const prefix = user?.email?.split("@")[0];
    if (prefix) return prefix;
    return "Kullanıcı";
  })();

  // ── Derived values ────────────────────────────────────────────────────────
  const totalAnswered =
    (stats?.totalCorrectAnswers ?? 0) + (stats?.totalWrongAnswers ?? 0);

  const successRateValue =
    statsError
      ? "--"
      : statsLoading
      ? ""
      : totalAnswered > 0
      ? String(Math.round(((stats!.totalCorrectAnswers) / totalAnswered) * 100))
      : "0";

  const successRateSubtitle =
    totalAnswered === 0
      ? "Henüz soru çözülmedi"
      : `${stats?.totalCorrectAnswers ?? 0} doğru / ${stats?.totalWrongAnswers ?? 0} yanlış`;

  const solvedValue =
    statsError ? "--" : statsLoading ? "" : String(stats?.totalQuestionsSolved ?? 0);

  const solvedSubtitle =
    (stats?.totalQuestionsGenerated ?? 0) > 0
      ? `${stats?.totalQuestionsGenerated} soru üretildi`
      : "Henüz soru çözülmedi";

  const totalDocsValue =
    totalDocumentsLoading ? "" : String(totalDocuments);

  const totalDocsSubtitle =
    totalDocuments === 0
      ? "Henüz döküman yüklenmedi"
      : `${totalDocuments} döküman mevcut`;

  const streakValue =
    statsError ? "--" : statsLoading ? "" : String(stats?.currentStreak ?? 0);

  const streakSubtitle =
    (stats?.longestStreak ?? 0) > 1
      ? `En uzun: ${stats?.longestStreak} gün`
      : "Bugün başla!";

  // ── Document delete ───────────────────────────────────────────────────────
  async function handleDelete(id: string, storagePath: string | null) {
    if (!user) return;
    try {
      await deleteDocument(user.uid, id, storagePath);
      refresh();
      toast.success("Döküman silindi.");
    } catch (err) {
      console.error("[OverviewPage] Delete error:", err);
      toast.error("Döküman silinirken bir hata oluştu.");
    }
  }

  // ── Layout is always rendered – no skeleton, no blocking ─────────────────
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <h2 className="text-[26px] font-bold text-gray-900">
        Merhaba, {displayName}
      </h2>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Genel Başarı"
          loading={statsLoading}
          value={successRateValue}
          unit="%"
          subtitle={statsLoading ? undefined : successRateSubtitle}
          accentColor="#4CAF50"
          subtitleColor="#6B7280"
        />

        <StatCard
          title="Çözülen Sorular"
          loading={statsLoading}
          value={solvedValue}
          unit="ADET"
          subtitle={statsLoading ? undefined : solvedSubtitle}
          accentColor="#1a1a1a"
          subtitleColor="#6B7280"
        />

        <StatCard
          title="Toplam Döküman"
          loading={totalDocumentsLoading}
          value={totalDocsValue}
          unit="ADET"
          subtitle={totalDocumentsLoading ? undefined : totalDocsSubtitle}
          accentColor="#6B7280"
          subtitleColor="#6B7280"
        />

        <StatCard
          title="Çalışma Serisi"
          loading={statsLoading}
          value={streakValue}
          unit="GÜN"
          subtitle={statsLoading ? undefined : streakSubtitle}
          accentColor="#F59E0B"
          subtitleColor="#F59E0B"
        />
      </div>

      {/* ── Document Distribution + Activity Chart ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocumentSuccessDistribution
          documents={documentStats}
          loading={documentsLoading}
        />
        <ActivityChart
          days={activityDays}
          loading={activityLoading}
        />
      </div>

      {/* ── Recent Documents – hidden while loading or when empty ─────────── */}
      {!recentDocsLoading && recentDocuments.length > 0 && (
        <RecentDocuments
          documents={recentDocuments}
          onOpen={(url) => window.open(url, "_blank")}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
