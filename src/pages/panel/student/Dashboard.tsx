import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import type { JSX } from "react";

export function StudentDashboard(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    toast.success("Başarıyla çıkış yapıldı.");
    navigate("/login", { replace: true });
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Öğrenci Paneli</h1>
          <p style={styles.info}>{user?.email}</p>
          <p style={styles.role}>Rol: Öğrenci</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Çıkış Yap
        </button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Derslerim</h2>
        <div style={styles.cardContent}>
          <p style={styles.placeholder}>Henüz ders bulunmamaktadır.</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", background: "#f5f5f5", padding: "40px", fontFamily: "'Poppins', sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" },
  title: { fontSize: "28px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px 0" },
  info: { fontSize: "14px", color: "#7F6B67", margin: "0 0 2px 0" },
  role: { fontSize: "13px", color: "#999", margin: 0 },
  logoutBtn: { padding: "10px 24px", borderRadius: "10px", border: "none", background: "#513C3C", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  card: { background: "#fff", borderRadius: "16px", padding: "28px 32px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  cardTitle: { fontSize: "18px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 16px 0" },
  cardContent: { padding: "20px 0" },
  placeholder: { fontSize: "14px", color: "#999", margin: 0 },
};
