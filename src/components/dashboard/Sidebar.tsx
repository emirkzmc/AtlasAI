import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { SIDEBAR_MENU_DATA } from "../../constants/dashboard.constants";
import {
  getUserDisplayName,
  getUserPhotoSrc,
  getUserInitials,
} from "../../utils/userDisplay";

const SIDEBAR_OPEN = 280;
const SIDEBAR_CLOSED = 88;
const ITEM_HEIGHT = 48;
const ICON_COL_WIDTH = 56;
const SECTION_LABEL_HEIGHT = 36;

interface SidebarProps {
  activeId: string;
  setActiveId: (id: string) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ activeId, setActiveId, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayName = getUserDisplayName(user);
  const photoSrc = getUserPhotoSrc(user);
  const initials = getUserInitials(displayName);

  function goToProfile() {
    setActiveId("profilim");
  }

  const effectiveIsOpen = isMobile ? true : isOpen;

  return (
    <motion.div
      initial={false}
      animate={{ 
        width: effectiveIsOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED,
        x: isMobile ? (isMobileOpen ? 0 : -SIDEBAR_OPEN) : 0
      }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`h-screen bg-white flex flex-col shrink-0 overflow-hidden ${
        isMobile ? "fixed inset-y-0 left-0 z-50 shadow-2xl" : "relative"
      }`}
      style={{ borderRight: isMobile ? "none" : "1px solid #E5E5E5" }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="h-[72px] shrink-0 mt-8 mb-8 flex items-center relative px-4">
          <motion.h1
            className="absolute left-8 text-3xl font-bold tracking-wide text-black whitespace-nowrap overflow-hidden text-ellipsis"
            animate={{ opacity: effectiveIsOpen ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            style={{
              visibility: effectiveIsOpen ? "visible" : "hidden",
              maxWidth: effectiveIsOpen ? 180 : 0,
            }}
          >
            AtlasAI
          </motion.h1>
          {isMobile ? (
             <button
              type="button"
              onClick={() => setIsMobileOpen?.(false)}
              className="cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0 z-10 ml-auto mr-4"
              aria-label="Menüyü kapat"
            >
              <img src="/icons/sidebar-close.svg" alt="" className="w-9 h-9 opacity-70" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0 z-10 ${
                isOpen ? "ml-auto mr-4" : "mx-auto"
              }`}
              aria-label={isOpen ? "Kenar çubuğunu daralt" : "Kenar çubuğunu genişlet"}
            >
              <img
                src={isOpen ? "/icons/sidebar-icon.svg" : "/icons/sidebar-close.svg"}
                alt=""
                className="w-9 h-9 opacity-70"
              />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto overflow-x-hidden">
          {SIDEBAR_MENU_DATA.map((section, idx) => (
            <div key={idx} className="flex flex-col shrink-0">
              <div
                className="shrink-0 flex items-end px-8 overflow-hidden"
                style={{ height: SECTION_LABEL_HEIGHT }}
              >
                <span
                  className="block text-[13px] font-medium text-[#717171] whitespace-nowrap overflow-hidden text-ellipsis w-full transition-opacity duration-250"
                  style={{
                    opacity: effectiveIsOpen ? 1 : 0,
                    visibility: effectiveIsOpen ? "visible" : "hidden",
                    maxWidth: effectiveIsOpen ? "100%" : 0,
                  }}
                >
                  {section.group}
                </span>
              </div>

              {section.items.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <div
                    key={item.id}
                    className="relative shrink-0 w-full"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveId(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setActiveId(item.id);
                      }}
                      className={`group flex items-center cursor-pointer transition-[width,background-color,box-shadow] duration-200 ${
                        effectiveIsOpen
                          ? "relative w-full"
                          : "absolute left-0 top-0 z-10 bg-white hover:z-50 hover:w-[240px] hover:bg-[#F3F0EF] hover:shadow-[2px_0_12px_rgba(0,0,0,0.06)]"
                      } ${isActive ? "text-[#5B4F4B]" : "text-[#737373]"}`}
                      style={{
                        height: ITEM_HEIGHT,
                        width: effectiveIsOpen ? "100%" : SIDEBAR_CLOSED,
                        borderLeft: isActive
                          ? "4px solid #5B4F4B"
                          : "4px solid transparent",
                        backgroundColor: isActive && effectiveIsOpen ? "#F3F0EF" : undefined,
                      }}
                    >
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: ICON_COL_WIDTH, height: ITEM_HEIGHT }}
                      >
                        <img
                          src={item.icon}
                          alt=""
                          className={`w-[24px] h-[24px] shrink-0 ${
                            isActive ? "opacity-100" : "opacity-70"
                          }`}
                          style={
                            isActive
                              ? {
                                  filter:
                                    "brightness(0) saturate(100%) invert(31%) sepia(15%) saturate(545%) hue-rotate(338deg) brightness(95%) contrast(87%)",
                                }
                              : undefined
                          }
                        />
                      </div>

                      <span
                        className={`min-w-0 text-[15px] font-medium pr-3 whitespace-nowrap overflow-hidden text-ellipsis transition-[opacity,max-width] duration-250 ${
                          isActive ? "text-[#5B4F4B]" : "text-[#737373]"
                        } ${
                          effectiveIsOpen
                            ? ""
                            : "opacity-0 max-w-0 invisible group-hover:opacity-100 group-hover:max-w-[160px] group-hover:visible"
                        }`}
                        style={
                          effectiveIsOpen
                            ? { opacity: 1, visibility: "visible", maxWidth: 200 }
                            : undefined
                        }
                      >
                        {item.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`mt-auto pb-6 shrink-0 ${
          effectiveIsOpen ? "px-6" : "px-0 flex justify-center"
        }`}
      >
        <button
          type="button"
          onClick={goToProfile}
          className={`flex cursor-pointer rounded-xl transition-colors hover:bg-[#F3F0EF] text-left border-0 bg-transparent w-full ${
            effectiveIsOpen
              ? "flex-col items-start gap-2.5 p-3 -mt-1"
              : "flex-col items-center justify-center p-2"
          }`}
          aria-label="Profilim sayfasına git"
        >
          {photoSrc ? (
            <img
              src={photoSrc}
              alt=""
              className="w-[42px] h-[42px] rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-[42px] h-[42px] rounded-full bg-[#5B4F4B] flex items-center justify-center shrink-0">
              <span className="text-white text-[15px] font-semibold select-none">
                {initials}
              </span>
            </div>
          )}

          <motion.div
            className="flex flex-col items-start w-full min-w-0 text-left overflow-hidden"
            animate={{ opacity: effectiveIsOpen ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            style={{
              visibility: effectiveIsOpen ? "visible" : "hidden",
              maxHeight: effectiveIsOpen ? 48 : 0,
            }}
          >
            <span className="text-[15px] font-semibold text-[#1a1a1a] w-full truncate text-left">
              {displayName}
            </span>
            <span className="text-[13px] text-[#A3A3A3] w-full truncate text-left">
              {user?.email ?? ""}
            </span>
          </motion.div>
        </button>
      </div>
    </motion.div>
  );
}
