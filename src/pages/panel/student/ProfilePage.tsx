import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { useProfileUpdate } from "../../../hooks/useProfileUpdate";
import {
  getActivityLogs,
  getDashboardStats,
  getLast7DaysQuestionActivity,
  getTotalDocuments,
  type DashboardStats,
  type DailyQuestionActivityDay,
} from "../../../services/dashboard.service";
import ActivityHeatmap from "../../../components/dashboard/profile/ActivityHeatmap";
import ProfileAvatar from "../../../components/dashboard/profile/ProfileAvatar";
import EditableProfileInfoCard from "../../../components/dashboard/profile/EditableProfileInfoCard";
import EmailProfileInfoCard from "../../../components/dashboard/profile/EmailProfileInfoCard";
import EmailChangeModal from "../../../components/dashboard/profile/EmailChangeModal";
import { getUserDisplayName } from "../../../utils/userDisplay";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

function ProfileInfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col justify-center">
      <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-2">{label}</span>
      <span className="text-[16px] text-[#1a1a1a]">{value}</span>
    </div>
  );
}

function DailyQuestionActivityChart({
  data,
  loading,
  error,
}: {
  data: DailyQuestionActivityDay[];
  loading: boolean;
  error: boolean;
}) {
  const hasData = data.some((item) => item.questionsSolved > 0);
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        data: data.map((item) => item.questionsSolved),
        backgroundColor: "#998A85",
        borderColor: "#b09f99",
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 28,
      },
    ],
  };
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a1a1a",
        titleColor: "#fff",
        bodyColor: "#f5f5f5",
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y} soru`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: "#E5E5E5" },
        ticks: {
          color: "#737373",
          font: { family: "Poppins, sans-serif", size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        border: { color: "#E5E5E5" },
        grid: { color: "#F0E7EA" },
        ticks: {
          precision: 0,
          color: "#737373",
          font: { family: "Poppins, sans-serif", size: 11 },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="h-full min-h-47.5 flex items-center justify-center text-[#999] text-[14px]">
        Yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-47.5 flex items-center justify-center text-center text-red-500 text-[13px]">
        Günlük çözüm verisi yüklenemedi.
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-full min-h-47.5 flex items-center justify-center text-center text-[#999] text-[14px]">
        Son 7 günde henüz soru çözülmedi
      </div>
    );
  }

  return (
    <div className="h-52.5 w-full">
      <Bar data={chartData} options={options} />
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
  const [dailyQuestionActivity, setDailyQuestionActivity] = useState<DailyQuestionActivityDay[]>([]);
  const [dailyQuestionLoading, setDailyQuestionLoading] = useState(true);
  const [dailyQuestionError, setDailyQuestionError] = useState(false);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalDocumentsLoading, setTotalDocumentsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [photoError, setPhotoError] = useState("");

  // E-posta modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const {
    updatingName,
    nameError,
    handleNameUpdate,
    sendingEmailVerification,
    emailError,
    emailSuccess,
    handleEmailChange,
    resetEmailState,
    countdown,
  } = useProfileUpdate();

  useEffect(() => {
    const handleQuizSaved = () => setStatsRefreshKey((key) => key + 1);
    window.addEventListener("atlasai:quiz-result-saved", handleQuizSaved);
    return () => window.removeEventListener("atlasai:quiz-result-saved", handleQuizSaved);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    // Use a microtask to defer the loading state update, 
    // avoiding the synchronous setState warning in the effect body.
    Promise.resolve().then(() => {
      if (!cancelled) setActivityLoading(true);
    });

    getActivityLogs(user.uid, 64)
      .then((data) => {
        if (!cancelled) setActivityData(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[ProfilePage] activity logs error:", err);
          setActivityData({});
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      const timeoutId = window.setTimeout(() => {
        setDailyQuestionActivity([]);
        setDailyQuestionLoading(false);
        setDailyQuestionError(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    let cancelled = false;
    const stateTimeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setDailyQuestionLoading(true);
        setDailyQuestionError(false);
      }
    }, 0);

    getLast7DaysQuestionActivity(user.uid)
      .then((data) => {
        if (!cancelled) setDailyQuestionActivity(data);
      })
      .catch((err) => {
        console.error("[ProfilePage] daily question activity error:", err);
        if (!cancelled) {
          setDailyQuestionActivity([]);
          setDailyQuestionError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDailyQuestionLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(stateTimeoutId);
    };
  }, [user?.uid, statsRefreshKey]);

  useEffect(() => {
    if (!user?.uid) {
      Promise.resolve().then(() => {
        setTotalDocuments(0);
        setTotalDocumentsLoading(false);
      });
      return;
    }

    let cancelled = false;

    // Use a microtask to defer the loading state update, 
    // avoiding the synchronous setState warning in the effect body.
    Promise.resolve().then(() => {
      if (!cancelled) setTotalDocumentsLoading(true);
    });

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

  useEffect(() => {
    if (!user?.uid) {
      const timeoutId = window.setTimeout(() => {
        setStats(null);
        setStatsLoading(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    let cancelled = false;
    const stateTimeoutId = window.setTimeout(() => {
      if (!cancelled) setStatsLoading(true);
    }, 0);

    getDashboardStats(user.uid)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        console.error("[ProfilePage] stats error:", err);
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(stateTimeoutId);
    };
  }, [user?.uid, statsRefreshKey]);

  const handleNameSave = useCallback(
    async (newName: string): Promise<boolean> => {
      const success = await handleNameUpdate(newName);
      if (success) {
        toast.success("Ad soyad başarıyla güncellendi.");
      }
      return success;
    },
    [handleNameUpdate]
  );

  const handleEmailSubmit = useCallback(
    async (newEmail: string, currentPassword: string): Promise<boolean> => {
      return handleEmailChange(newEmail, currentPassword);
    },
    [handleEmailChange]
  );

  const handleEmailModalClose = useCallback(() => {
    setEmailModalOpen(false);
    // Kısa gecikme ile state sıfırla (kapanma animasyonu bitmeden sıfırlama)
    setTimeout(resetEmailState, 300);
  }, [resetEmailState]);

  const displayName = getUserDisplayName(user);
  const age = user?.age ?? calcAge(user?.birthDate);
  const ageDisplay = age !== undefined ? String(age) : "--";
  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(user.createdAt)
    : "Bilinmiyor";
  const totalDocumentsText = totalDocumentsLoading
    ? "-- Toplam Doküman"
    : `Toplam Doküman: ${totalDocuments}`;
  const totalAnswered = stats?.totalQuestionsAnswered ?? stats?.totalQuestionsSolved ?? 0;
  const totalCorrect = stats?.totalCorrectAnswers ?? 0;
  const generalSuccessRate =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const successText = statsLoading
    ? "Genel Başarı Yüzdesi: --"
    : `Genel Başarı Yüzdesi: %${generalSuccessRate}`;
  const totalQuestionsText = statsLoading ? "-- Soru" : `${totalAnswered} Soru`;

  let currentStreak = 0;
  if (activityData && Object.keys(activityData).length > 0) {
    const dates = Object.keys(activityData)
      .filter((dateStr) => activityData[dateStr] > 0)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
    if (dates.length > 0) {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const toYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      
      const todayStr = toYMD(today);
      const yesterdayStr = toYMD(yesterday);
      
      if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
        const currentDate = dates.includes(todayStr) ? today : yesterday;
        for (let i = 0; i < dates.length; i++) {
          const d = new Date(currentDate);
          d.setDate(d.getDate() - currentStreak);
          if (dates.includes(toYMD(d))) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-250 mx-auto pb-10 w-full">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left">
        <div className="flex flex-col items-start gap-2 shrink-0">
          <ProfileAvatar size={120} editable onError={setPhotoError} />
          {photoError && (
            <p className="text-[13px] text-red-600 max-w-55 m-0">{photoError}</p>
          )}
        </div>
        <div className="flex flex-col min-w-0 items-center sm:items-start">
          <h2 className="text-[28px] sm:text-[32px] font-semibold text-[#1a1a1a] mb-1">{displayName}</h2>
          <p className="text-[15px] sm:text-[16px] text-[#737373] mb-5">Üye oldu: {joinedDate}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span className="px-4 py-2 sm:px-5 bg-white rounded-full text-[13px] sm:text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">{successText}</span>
            <span className="px-4 py-2 sm:px-5 bg-white rounded-full text-[13px] sm:text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">{totalDocumentsText}</span>
            <span className="px-4 py-2 sm:px-5 bg-white rounded-full text-[13px] sm:text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">🔥 {currentStreak} günlük seri</span>
            <span className="px-4 py-2 sm:px-5 bg-white rounded-full text-[13px] sm:text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">{totalQuestionsText}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableProfileInfoCard
          label="Ad Soyad"
          value={displayName}
          onSave={handleNameSave}
          saving={updatingName}
          error={nameError}
        />
        <EmailProfileInfoCard
          label="E-Posta"
          value={user?.email || "-"}
          onEditClick={() => setEmailModalOpen(true)}
        />
        <ProfileInfoCard label="Yaş" value={ageDisplay} />
        <ProfileInfoCard label="Üyelik Başlangıcı" value={joinedDate} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] min-h-65 flex flex-col">
          <h3 className="text-[13px] font-semibold text-[#737373] uppercase tracking-wide mb-4">
            <span className="text-[13px]">Günlük Çözüm Aktivitesi</span>
          </h3>
          <div className="w-full flex-1 rounded-xl border border-[#F1E1E6] bg-[#fffafb] px-3 py-4">
            <DailyQuestionActivityChart
              data={dailyQuestionActivity}
              loading={dailyQuestionLoading}
              error={dailyQuestionError}
            />
          </div>
        </div>
        <ActivityHeatmap activityData={activityData} loading={activityLoading} days={64} />
      </div>

      {/* E-posta değiştirme modalı */}
      <EmailChangeModal
        isOpen={emailModalOpen}
        onClose={handleEmailModalClose}
        onSubmit={handleEmailSubmit}
        sending={sendingEmailVerification}
        error={emailError}
        success={emailSuccess}
        currentEmail={user?.email || ""}
      />

      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            className="fixed inset-0 z-2000 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#43A047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">E-posta Doğrulandı!</h3>
              <p className="text-[#737373] text-[15px] mb-6">
                Hesabınız başarıyla güncellendi. Güvenliğiniz için yeniden giriş yapmanız gerekiyor.
              </p>
              <div className="flex items-center justify-center gap-2 text-[#5B4F4B] font-semibold text-lg bg-[#5B4F4B]/10 py-3 rounded-xl">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {countdown} saniye içinde yönlendiriliyorsunuz...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
