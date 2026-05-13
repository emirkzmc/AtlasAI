import type { MenuGroup } from "../types/dashboard.types";

export const SIDEBAR_MENU_DATA: MenuGroup[] = [
  {
    group: "Genel",
    items: [
      { name: "Genel Bakış", icon: "/icons/general-icon.svg", id: "genel-bakis" },
      { name: "Dokümanlarım", icon: "/icons/doc-icon.svg", id: "dokumanlarim" },
    ]
  },
  {
    group: "Analiz",
    items: [
      { name: "Performans", icon: "/icons/performance-icon.svg", id: "performans", width:"24px", height:"24px" },
      { name: "Yanlışlarım", icon: "/icons/fail-icon.svg", id: "yanlislarim", width: "24px", height: "24px" },
      { name: "Mentorluk", icon: "/icons/compass-icon.svg", id: "mentorluk", width: "24px", height: "24px" },
    ]
  }
];
