import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getActivityLogs, getTotalDocuments } from "../../../services/dashboard.service";
import ActivityHeatmap from "../../../components/dashboard/profile/ActivityHeatmap";
import ProfileAvatar from "../../../components/dashboard/profile/ProfileAvatar";
import { getUserDisplayName } from "../../../utils/userDisplay";

function ProfileInfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col justify-center">
      <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-2">{label}</span>
      <span className="text-[16px] text-[#1a1a1a]">{value}</span>
    </div>
  );
}

function calcAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const today = new Date();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasBirthdayPassed) age -= 1;
  return age >= 0 ? age : undefined;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [activityLoading, setActivityLoading] = useState(true);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalDocumentsLoading, setTotalDocumentsLoading] = useState(true);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    setActivityLoading(true);
    getActivityLogs(user.uid, 64)
      .then(setActivityData)
      .catch((err) => {
        console.error("[ProfilePage] activity logs error:", err);
        setActivityData({});
      })
      .finally(() => setActivityLoading(false));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setTotalDocuments(0);
      setTotalDocumentsLoading(false);
      return;
    }

    let cancelled = false;
    setTotalDocumentsLoading(true);

    getTotalDocuments(user.uid)
      .then((count) => {
        if (!cancelled) setTotalDocuments(count);
      })
      .catch((err) => {
        console.error("[ProfilePage] total documents error:", err);
        if (!cancelled) setTotalDocuments(0);
      })
      .finally(() => {
        if (!cancelled) setTotalDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const displayName = getUserDisplayName(user);
  const age = user?.age ?? calcAge(user?.birthDate);
  const ageDisplay = age !== undefined ? String(age) : "--";
  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(user.createdAt)
    : "Bilinmiyor";
  const totalDocumentsText = totalDocumentsLoading
    ? "-- Toplam Doküman"
    : `Toplam Doküman: ${totalDocuments}`;

  return (
    <div className="flex flex-col gap-8 max-w-250 mx-auto pb-10 w-full">
      <div className="flex items-start gap-8">
        <div className="flex flex-col items-start gap-2 shrink-0">
          <ProfileAvatar size={120} editable onError={setPhotoError} />
          {photoError && (
            <p className="text-[13px] text-red-600 max-w-55 m-0">{photoError}</p>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-[32px] font-semibold text-[#1a1a1a] mb-1">{displayName}</h2>
          <p className="text-[16px] text-[#737373] mb-5">Üye oldu: {joinedDate}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">-- Başarı</span>
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">{totalDocumentsText}</span>
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">🔥 -- günlük seri</span>
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">-- Soru</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProfileInfoCard label="Ad Soyad" value={displayName} />
        <ProfileInfoCard label="E-Posta" value={user?.email || "-"} />
        <ProfileInfoCard label="Yaş" value={ageDisplay} />
        <ProfileInfoCard label="Üyelik Başlangıcı" value={joinedDate} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] min-h-65 flex flex-col">
          <h3 className="text-[13px] font-semibold text-[#737373] uppercase tracking-wide mb-4">
            Akademik Genel Bakış
          </h3>
          <div className="w-full flex-1 flex items-center justify-center text-[#999] text-[14px] italic border border-dashed border-[#e0e0e0] rounded-xl bg-[#fafafa]">
            Grafik verisi henüz yok
          </div>
        </div>
        <ActivityHeatmap activityData={activityData} loading={activityLoading} days={64} />
      </div>
    </div>
  );
}
