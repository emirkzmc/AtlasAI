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

  const correctAnswers = stats?.totalCorrectAnswers ?? 0;
  const wrongAnswers = stats?.totalWrongAnswers ?? 0;
  const blankAnswers = stats?.totalBlankAnswers ?? 0;
  const totalAnswered =
    stats?.totalQuestionsAnswered ??
    stats?.totalQuestionsSolved ??
    correctAnswers + wrongAnswers + blankAnswers;
  const calculatedSuccessRate =
    totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

  const successRateValue = statsError
    ? "--"
    : statsLoading
      ? ""
      : totalAnswered > 0
        ? String(stats?.averageSuccessRate ?? calculatedSuccessRate)
        : "0";

  const successRateSubtitle =
    totalAnswered === 0
      ? "Henüz görev tamamlanmadı"
      : `${correctAnswers} başarılı senaryo / ${wrongAnswers} hatalı çözüm / ${blankAnswers} es geçilen`;

  const solvedValue = statsError ? "--" : statsLoading ? "" : String(totalAnswered);

  const solvedSubtitle =
    (stats?.totalQuestionsGenerated ?? 0) > 0
      ? `${stats?.totalQuestionsGenerated} problem üretildi`
      : "Henüz problem çözülmedi";

  const totalDocsValue = totalDocumentsLoading ? "" : String(totalDocuments);

  const totalDocsSubtitle =
    totalDocuments === 0
      ? "Henüz teknik doküman yüklenmedi"
      : `${totalDocuments} teknik doküman mevcut`;

  const streakValue =
    statsError ? "--" : statsLoading ? "" : String(stats?.currentStreak ?? 0);

  const streakSubtitle =
    (stats?.longestStreak ?? 0) > 1
      ? `En uzun: ${stats?.longestStreak} gün`
      : "Bugün başla!";

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

  return (
    <div className="space-y-6">
      <h2 className="text-[26px] font-bold text-gray-900">
        Merhaba, {displayName}
      </h2>

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
          title="Çözülen Problemler"
          loading={statsLoading}
          value={solvedValue}
          unit="ADET"
          subtitle={statsLoading ? undefined : solvedSubtitle}
          accentColor="#1a1a1a"
          subtitleColor="#6B7280"
        />

        <StatCard
          title="İncelenen Teknik Dokümanlar"
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
