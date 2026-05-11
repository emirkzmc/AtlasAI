export interface MenuItem {
  name: string;
  icon: string;
  id: string;
  width?: string;
  height?: string;
}

export interface MenuGroup {
  group: string;
  items: MenuItem[];
}
