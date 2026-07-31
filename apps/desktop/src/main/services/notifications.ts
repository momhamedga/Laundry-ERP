import { Notification } from "electron";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";

const log = scoped("notifications");

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
