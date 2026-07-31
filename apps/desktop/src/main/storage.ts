import Store from "electron-store";

/**
 * تخزين إعدادات دائم (electron-store): يحفظ حالة النافذة، الثيم، اللغة، الطابعة،
 * والملفّات الأخيرة. JSON مُتحقَّق-النوع في userData. لا بيانات حساسة (لا توكينات).
 */
export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

interface StoreSchema {
  windowState: WindowState;
  theme: "light" | "dark" | "system";
  language: "ar" | "en";
  printer: string | null;
  recentPrinter: string | null;
  settings: Record<string, unknown>;
  recentFiles: string[];
}

const DEFAULTS: StoreSchema = {
  windowState: { width: 1280, height: 800, maximized: false },
  theme: "system",
  language: "ar",
  printer: null,
  recentPrinter: null,
  settings: {},
  recentFiles: [],
};

const store = new Store<StoreSchema>({ defaults: DEFAULTS, name: "desktop-settings" });

export function getSetting<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
  return store.get(key);
}
export function setSetting<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
  store.set(key, value);
}
export function deleteSetting(key: keyof StoreSchema): void {
  store.delete(key);
}

/** مفاتيح آمنة للوصول من الـ renderer (whitelist لمنع الكتابة خارج المخطّط) */
export const RENDERER_ALLOWED_KEYS = new Set<keyof StoreSchema>([
  "theme",
  "language",
  "printer",
  "recentPrinter",
  "settings",
]);

// ==================== الملفّات الأخيرة ====================
const MAX_RECENT = 15;

export function addRecentFile(filePath: string): string[] {
  const current = store.get("recentFiles").filter((f) => f !== filePath);
  const next = [filePath, ...current].slice(0, MAX_RECENT);
  store.set("recentFiles", next);
  return next;
}
export function listRecentFiles(): string[] {
  return store.get("recentFiles");
}
export function clearRecentFiles(): void {
  store.set("recentFiles", []);
}

export default store;
