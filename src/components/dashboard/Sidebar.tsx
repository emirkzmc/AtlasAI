import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

import { SIDEBAR_MENU_DATA } from "../../constants/dashboard.constants";

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface SidebarProps {
  activeId: string;
  setActiveId: (id: string) => void;
}

export default function Sidebar({ activeId, setActiveId }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { user } = useAuth();

  const displayName = user?.fullName ?? user?.email ?? "Kullanıcı";
  const initials = getInitials(user?.fullName ?? user?.email?.split("@")[0]);

  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 280 : 88 }}
      className="h-screen bg-white flex flex-col shrink-0 relative"
      style={{ borderRight: "1px solid #E5E5E5" }}
    >
      <div className="flex flex-col flex-1">
        <div className={`flex items-center mt-8 mb-8 ${isOpen ? "px-8 justify-between" : "justify-center"}`}>
          {isOpen && <h1 className="text-3xl font-bold tracking-wide text-black">ADMIX</h1>}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <img src={isOpen ? "/icons/sidebar-icon.svg" : "/icons/sidebar-close.svg"} alt="Toggle" className="w-9 h-9 opacity-70" />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {SIDEBAR_MENU_DATA.map((section, idx) => (
            <div key={idx} className="flex flex-col">
              {isOpen && (
                <span className="px-8 text-[13px] font-medium text-[#717171] mb-3">
                  {section.group}
                </span>
              )}
              {section.items.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <div key={item.id} className="relative h-[48px] w-full">
                    <div
                      onClick={() => setActiveId(item.id)}
                      className={`border-r border-[#E5E5E5] group flex items-center cursor-pointer transition-all duration-300 h-[48px] ${isOpen
                          ? "pl-[30px] pr-4 w-full relative"
                          : "justify-start pl-[28px] absolute left-0 top-0 w-[88px] hover:w-[240px] hover:bg-[#F3F0EF] z-50 bg-white "
                        } ${isActive
                          ? "text-[#5B4F4B]"
                          : "text-[#737373] hover:bg-[#F3F0EF]"
                        }`}
                      style={{
                        borderLeft: isActive ? "4px solid #5B4F4B" : "4px solid transparent",
                        backgroundColor: isActive && !isOpen ? "" : undefined
                      }}
                    >
                      <div className="flex items-center justify-center shrink-0">
                        <img
                          src={item.icon}
                          alt={item.name}
                          className={`w-[24px] h-[24px] transition-all duration-200 ${isOpen ? "group-hover:rotate-10 group-hover:w-[24px] group-hover:h-[24px]" : ""
                            } ${isActive ? "opacity-100" : "opacity-70"}`}
                          style={isActive ? { filter: "brightness(0) saturate(100%) invert(31%) sepia(15%) saturate(545%) hue-rotate(338deg) brightness(95%) contrast(87%)" } : {}}
                        />
                      </div>

                      {isOpen && (
                        <span className={`ml-4 text-[15px] transition-colors ${isActive ? "font-medium text-[#5B4F4B]" : "font-medium text-[#737373] group-hover:text-[#5B4F4B] "}`}>
                          {item.name}
                        </span>
                      )}

                      {!isOpen && (
                        <span className={`ml-4 text-[15px] whitespace-nowrap overflow-hidden transition-all duration-300 ${isActive ? "font-medium text-[#5B4F4B]" : "font-medium text-[#737373] group-hover:text-[#5B4F4B]"
                          } opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto`}>
                          {item.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-auto pb-8 ${isOpen ? "px-8 flex justify-between items-center" : "flex flex-col items-center"}`}>
        <button
          type="button"
          onClick={() => setActiveId("profilim")}
          className={`flex cursor-pointer rounded-lg text-left transition-colors hover:bg-[#F3F0EF] ${isOpen ? "w-full items-center gap-3 p-2" : "items-center p-2"}`}
          aria-label="Profilim sayfasına git"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-[42px] h-[42px] rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-[42px] h-[42px] rounded-full bg-[#5B4F4B] flex items-center justify-center shrink-0">
              <span className="text-white text-[15px] font-semibold select-none">{initials}</span>
            </div>
          )}
          {isOpen && (
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-[#1a1a1a]">{displayName}</span>
              <span className="text-[13px] text-[#A3A3A3]">{user?.email}</span>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}
