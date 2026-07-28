import { create } from "zustand";

interface UiState {
  /** طي الشريط الجانبي (سطح المكتب) */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** فتح الشريط الجانبي (الجوال - Sheet) */
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));
