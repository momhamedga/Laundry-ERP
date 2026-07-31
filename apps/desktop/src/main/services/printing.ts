import { BrowserWindow, dialog } from "electron";
import fs from "node:fs/promises";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";
import type {
  PdfExportOptions,
  PrinterInfo,
  SilentPrintOptions,
} from "../../shared/ipc.js";

const log = scoped("printing");

/** يحمّل HTML في نافذة مخفيّة معزولة للطباعة ثم يتخلّص منها بعد الانتهاء. */
async function withPrintWindow<T>(
  html: string,
  fn: (win: BrowserWindow) => Promise<T>,
): Promise<T> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, offscreen: false },
  });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    // مهلة قصيرة لضمان اكتمال تخطيط الخطوط/الباركود قبل الطباعة
    await new Promise((r) => setTimeout(r, 120));
    return await fn(win);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

function marginType(m: SilentPrintOptions["margins"]): "default" | "none" | "printableArea" {
  if (m === "none") return "none";
  if (m === "minimum") return "printableArea";
  return "default";
}

/** قائمة الطابعات المتاحة (من نافذة العرض الرئيسية) */
export async function listPrinters(): Promise<PrinterInfo[]> {
  const win = getMainWindow();
  if (!win) return [];
  const printers = await win.webContents.getPrintersAsync();
  return printers.map((p) => ({
    name: p.name,
    displayName: p.displayName,
    description: p.description,
    isDefault: p.isDefault,
    status: p.status,
  }));
}

/** طباعة صامتة (فواتير/ملصقات باركود/حرارية) دون حوار النظام */
export async function silentPrint(opts: SilentPrintOptions): Promise<void> {
  await withPrintWindow(opts.html, async (win) => {
    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: opts.silent ?? true,
          deviceName: opts.deviceName,
          landscape: opts.landscape ?? false,
          copies: opts.copies ?? 1,
          printBackground: true,
          margins: { marginType: marginType(opts.margins) },
          pageSize: opts.pageSize ?? "A4",
        },
        (success, failureReason) => {
          if (success) resolve();
          else reject(new Error(failureReason || "Print failed"));
        },
      );
    });
  });
  log.info("silent print done:", opts.deviceName ?? "default");
}

/** معاينة/اختيار طابعة عبر حوار النظام (silent=false) */
export async function previewPrint(opts: SilentPrintOptions): Promise<void> {
  await silentPrint({ ...opts, silent: false });
}

/** تصدير HTML إلى PDF (A4/Landscape…) وحفظه؛ يفتح Save Dialog إن لم يُمرَّر مسار */
export async function exportPdf(opts: PdfExportOptions): Promise<string | null> {
  const buffer = await withPrintWindow(opts.html, (win) =>
    win.webContents.printToPDF({
      landscape: opts.landscape ?? false,
      printBackground: true,
      pageSize: opts.pageSize ?? "A4",
    }),
  );

  let savePath = opts.savePath;
  if (!savePath) {
    const parent = getMainWindow();
    const result = parent
      ? await dialog.showSaveDialog(parent, {
          title: "حفظ PDF",
          defaultPath: opts.defaultFileName ?? "document.pdf",
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        })
      : await dialog.showSaveDialog({
          defaultPath: opts.defaultFileName ?? "document.pdf",
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
    if (result.canceled || !result.filePath) return null;
    savePath = result.filePath;
  }

  await fs.writeFile(savePath, buffer);
  log.info("pdf exported:", savePath);
  return savePath;
}
