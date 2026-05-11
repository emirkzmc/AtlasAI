import { useState } from "react";
import type { JSX } from "react";
import Header from "../../../components/dashboard/Header";
import Sidebar from "../../../components/dashboard/Sidebar";
import { SIDEBAR_MENU_DATA } from "../../../constants/dashboard.constants";

export function StudentDashboard({ children }: { children: React.ReactNode }): JSX.Element {
  const [activeId, setActiveId] = useState("genel-bakis");

  let activeElement = "Genel Bakış";
  for (const group of SIDEBAR_MENU_DATA) {
    const item = group.items.find(i => i.id === activeId);
    if (item) {
      activeElement = item.name;
      break;
    }
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <Sidebar activeId={activeId} setActiveId={setActiveId} />
      <div className="flex-1 p-10 font-['Poppins',sans-serif] overflow-y-auto h-screen">
        <Header element={activeElement} />
        {children}
      </div>
    </div>
  );
}
