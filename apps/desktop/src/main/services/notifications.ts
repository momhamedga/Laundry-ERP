import { Notification } from "electron";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";

const log = scoped("notifications");

/** أنواع إشعارات سطح المكتب الاحترافية */
export type DesktopNotifyType =
  | "new-order"
  | "payment-success"
  | "inventory-low"
  | "sync-completed"
  | "new-update"
  | "backup-completed";

const TITLES: Record<DesktopNotifyType, string> = {
  "new-order": "طلب جديد",
  "payment-success": "تم الدفع بنجاح",
  "inventory-low": "تنبيه مخزون منخفض",
  "sync-completed": "اكتملت المزامنة",
  "new-update": "تحديث جديد متاح",
  "backup-completed": "اكتملت النسخة الاحتياطية",
};

/** إشعار مُصنّف حسب النوع (عنوان جاهز + نصّ مخصّص). */
export function notifyEvent(type: DesktopNotifyType, body: string): void {
  notify(TITLES[type], body);
}

/** إشعار سطح مكتب أصلي؛ النقر عليه يركّز النافذة الرئيسية. */
export function notify(title: string, body: string): void {
  if (!Notification.isSupported()) {
    log.warn("native notifications not supported on this OS");
    return;
  }
  const n = new Notification({ title, body, silent: false });
  n.on("click", () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  n.show();
}
