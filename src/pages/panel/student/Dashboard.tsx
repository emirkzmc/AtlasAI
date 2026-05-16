import type { JSX } from "react";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../../../components/dashboard/Header";
import Sidebar from "../../../components/dashboard/Sidebar";
import { SIDEBAR_MENU_DATA } from "../../../constants/dashboard.constants";

export function StudentDashboard(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const pathParts = location.pathname.split('/');
  const activeId = pathParts[pathParts.length - 1] || "genel-bakis";

  let activeElement = "Genel Bakış";
  if (activeId === "profilim") {
    activeElement = "Profilim";
  } else {
    for (const group of SIDEBAR_MENU_DATA) {
      const item = group.items.find(i => i.id === activeId);
      if (item) {
        activeElement = item.name;
        break;
      }
    }
  }

  const handleSetActiveId = (id: string) => {
    navigate(`/panel/student/${id}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] overflow-hidden">
      <Sidebar 
        activeId={activeId} 
        setActiveId={handleSetActiveId} 
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />
      
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 p-4 md:p-10 font-['Poppins',sans-serif] overflow-y-auto h-screen w-full relative">
        <Header 
          element={activeElement} 
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <Outlet />
      </div>
    </div>
  );
}
