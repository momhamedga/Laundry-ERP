import { Menu, app, shell, type MenuItemConstructorOptions } from "electron";
import { getMainWindow, navigateRenderer } from "../windows/main-window.js";
import { IS_DEV } from "../config.js";
import { showAboutDialog } from "./about.js";

/**
 * قائمة أصلية عربية. عناصر التنقّل تبثّ حدث NAVIGATE للـ SPA (لا تغيّر الـ routing).
 * أدوات المطوّر تظهر في التطوير فقط.
 */
export function buildAppMenu(): void {
  const isMac = process.platform === "darwin";

  const go = (route: string): void => navigateRenderer(route);

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "ملف",
      submenu: [
        { label: "لوحة التحكم", accelerator: "CmdOrCtrl+1", click: () => go("/") },
        { label: "الطلبات", accelerator: "CmdOrCtrl+2", click: () => go("/orders") },
        { label: "الفواتير", accelerator: "CmdOrCtrl+3", click: () => go("/invoices") },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "تحرير",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "عرض",
      submenu: [
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(IS_DEV ? [{ role: "toggleDevTools" as const }] : []),
      ],
    },
    {
      label: "مساعدة",
      submenu: [
        { label: "فحص الاتصال", click: () => getMainWindow()?.webContents.send("app:navigate", "/") },
        {
          label: "فتح مجلد السجلّات",
          click: () => void shell.openPath(app.getPath("logs")),
        },
        { type: "separator" as const },
        {
          label: "عن التطبيق",
          click: () => showAboutDialog(),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
