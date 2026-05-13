import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

/** Generate initials from a name (max 2 chars) */
function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName ?? user?.email ?? "Kullanıcı";
  const initials = getInitials(user?.fullName ?? user?.email?.split("@")[0]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout(): Promise<void> {
    try {
      await logout();
      toast.success("Başarıyla çıkış yapıldı.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Çıkış sırasında bir hata oluştu.");
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer w-[42px] h-[42px] rounded-full overflow-hidden border-2 border-transparent hover:border-[#5B4F4B]/30 transition-all duration-200 p-0 bg-transparent flex items-center justify-center"
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-[#5B4F4B] flex items-center justify-center">
            <span className="text-white text-[15px] font-semibold select-none">{initials}</span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-[52px] w-[220px] bg-white rounded-xl shadow-lg border border-[#E5E5E5] overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-[#F0F0F0]">
              <p className="text-[14px] font-semibold text-[#1a1a1a] m-0 truncate">{displayName}</p>
              <p className="text-[12px] text-[#999] m-0 truncate">{user?.email}</p>
            </div>

            {/* Links */}
            <button
              onClick={() => {
                navigate("/panel/student/profilim");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#737373] hover:bg-[#F9F7F6] hover:text-[#5B4F4B] transition-colors cursor-pointer bg-transparent border-none text-left border-b border-[#F0F0F0]"
              style={{ fontFamily: "inherit" }}
            >
              <img src="/icons/user-icon.svg" alt="Profile" className="w-[18px] h-[18px] opacity-70" />
              Profilim
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="group w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#737373] hover:bg-[#f9f6f6] hover:text-[#df7b7b] transition-colors cursor-pointer bg-transparent border-none text-left"
              style={{ fontFamily: "inherit" }}
            >
              <img
                src="/icons/log-out-icon.svg"
                alt="Logout"
                className="w-[18px] h-[18px] opacity-70 group-hover:opacity-100 transition-all duration-200 group-hover:filter-[invert(67%)_sepia(34%)_saturate(744%)_hue-rotate(313deg)_brightness(92%)_contrast(90%)]"
              />
              Çıkış Yap
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
