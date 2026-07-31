import { app, globalShortcut } from "electron";
import { scoped } from "../logger.js";
import type { ShortcutDef } from "../../shared/ipc.js";

const log = scoped("shortcuts");

/** اختصارات سطح المكتب (قابلة للتخصيص لاحقاً - تُعرَض في الإعدادات). */
export const SHORTCUTS: (ShortcutDef & { action: string })[] = [
  { id: "help", accelerator: "F1", description: "مساعدة", action: "help" },
  { id: "new-order", accelerator: "F2", description: "طلب جديد", action: "new-order" },
  { id: "search", accelerator: "F3", description: "بحث", action: "search" },
  { id: "save", accelerator: "CommandOrControl+S", description: "حفظ", action: "save" },
  { id: "print", accelerator: "CommandOrControl+P", description: "طباعة", action: "print" },
  { id: "new", accelerator: "CommandOrControl+N", description: "جديد", action: "new" },
  { id: "find", accelerator: "CommandOrControl+F", description: "إيجاد", action: "find" },
  { id: "sync", accelerator: "CommandOrControl+Shift+S", description: "مزامنة", action: "sync" },
  { id: "escape", accelerator: "Escape", description: "إلغاء/إغلاق", action: "escape" },
];

/**
 * تُسجَّل الاختصارات عند تركيز التطبيق وتُلغى عند فقد التركيز، فتتصرّف كاختصارات
 * محليّة (لا تُطلق والتطبيق في الخلفية). كل اختصار يبثّ حدثاً للواجهة لتتصرّف.
 */
export function registerShortcuts(broadcast: (action: string) => void): void {
  const bind = (): void => {
    for (const s of SHORTCUTS) {
      try {
        globalShortcut.register(s.accelerator, () => broadcast(s.action));
      } catch {
        /* تجاهل تعارضاً */
      }
    }
  };
  const unbind = (): void => globalShortcut.unregisterAll();

  app.on("browser-window-focus", bind);
  app.on("browser-window-blur", unbind);
  app.on("will-quit", unbind);
  log.info("shortcuts armed (focus-scoped):", SHORTCUTS.map((s) => s.accelerator).join(", "));
}

export function listShortcuts(): ShortcutDef[] {
  return SHORTCUTS.map(({ id, accelerator, description }) => ({ id, accelerator, description }));
}
