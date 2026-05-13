import { useAuth } from "../../../hooks/useAuth";
import ActivityHeatmap from "../../../components/dashboard/profile/ActivityHeatmap";

function ProfileInfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col justify-center">
      <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-2">{label}</span>
      <span className="text-[16px] text-[#1a1a1a]">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  
  const displayName = user?.fullName || user?.email || "Kullanıcı";
  
  // Format creation date e.g., "Eylül 2024"
  const joinedDate = user?.createdAt 
    ? new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(user.createdAt)
    : "Bilinmiyor";

  return (
    <div className="flex flex-col gap-8 max-w-[1000px] mx-auto pb-10 w-full">
      
      <div className="flex items-center gap-8">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden shrink-0 border-[3px] border-[#E8E8E8] shadow-sm bg-[#5B4F4B] flex items-center justify-center">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-[42px] font-semibold select-none">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <h2 className="text-[32px] font-semibold text-[#1a1a1a] mb-1">{displayName}</h2>
          <p className="text-[16px] text-[#737373] mb-5">Üye oldu: {joinedDate}</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">-- Başarı</span>
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">-- Doküman</span>
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">🔥 -- günlük seri</span>
            <span className="px-5 py-2 bg-white rounded-full text-[14px] font-medium text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">-- Soru</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProfileInfoCard label="Ad Soyad" value={displayName} />
        <ProfileInfoCard label="E-Posta" value={user?.email || "-"} />
        <ProfileInfoCard label="Yaş" value={user?.age || "-"} />
        <ProfileInfoCard label="Üyelik Başlangıcı" value={joinedDate} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] min-h-[260px] flex flex-col">
          <h3 className="text-[13px] font-semibold text-[#737373] uppercase tracking-wide mb-4">
            Akademik Genel Bakış
          </h3>
          <div className="w-full flex-1 flex items-center justify-center text-[#999] text-[14px] italic border border-dashed border-[#e0e0e0] rounded-xl bg-[#fafafa]">
            Grafik verisi henüz yok
          </div>
        </div>
        
        <ActivityHeatmap activityLog={user?.activityLog || []} days={64} />
      </div>

    </div>
  );
}
