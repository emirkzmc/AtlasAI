import type { JSX } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../../../components/dashboard/Header";
import Sidebar from "../../../components/dashboard/Sidebar";
import { SIDEBAR_MENU_DATA } from "../../../constants/dashboard.constants";

export function StudentDashboard(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  
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
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <Sidebar activeId={activeId} setActiveId={handleSetActiveId} />
      <div className="flex-1 p-10 font-['Poppins',sans-serif] overflow-y-auto h-screen">
        <Header element={activeElement} />
        <Outlet />
      </div>
    </div>
  );
}
