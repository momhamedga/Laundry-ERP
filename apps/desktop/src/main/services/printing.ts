import { BrowserWindow, dialog } from "electron";
import net from "node:net";
import fs from "node:fs/promises";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";
import type {
  PaperProfile,
  PdfExportOptions,
  PrinterInfo,
  RawPrintOptions,
  ReceiptPrintOptions,
  SilentPrintOptions,
} from "../../shared/ipc.js";

const log = scoped("printing");

/** أبعاد كل ملف طابعة بالميكرون (Electron pageSize يقبل {width,height} بالميكرون) */
const PAPER_SIZES: Record<PaperProfile, { width: number; height: number } | "A4" | "A5"> = {
  A4: "A4",
  A5: "A5",
  thermal58: { width: 58_000, height: 297_000 }, // 58mm × ~طويل
  thermal80: { width: 80_000, height: 297_000 }, // 80mm × ~طويل
  label: { width: 50_000, height: 30_000 }, // ملصق شائع 50×30mm
};

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

/**
 * طباعة إيصال/ملصق حسب ملف الطابعة (A4/58mm/80mm/label). silent=true تتجاوز حوار
 * النظام. تُعيد فتح درج الكاش اختيارياً بعد الطباعة (طابعة إيصالات).
 * ⚠️ الطباعة الحرارية/الملصقات تحتاج طابعة فعلية للتحقق - الكود جاهز، بلا اختبار عتاد هنا.
 */
export async function printReceipt(opts: ReceiptPrintOptions): Promise<void> {
  await withPrintWindow(opts.html, async (win) => {
    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: opts.silent ?? true,
          deviceName: opts.deviceName,
          landscape: opts.landscape ?? false,
          copies: opts.copies ?? 1,
          printBackground: true,
          margins: { marginType: opts.profile === "A4" || opts.profile === "A5" ? "default" : "none" },
          pageSize: PAPER_SIZES[opts.profile],
        },
        (success, failureReason) => (success ? resolve() : reject(new Error(failureReason || "Print failed"))),
      );
    });
  });
  log.info(`receipt printed (${opts.profile}) on`, opts.deviceName ?? "default");
}

/**
 * طباعة خام (ESC/POS) لطابعة شبكية عبر منفذ خام (9100). للطابعات الحرارية/الباركود
 * التي تقبل أوامر ESC/POS مباشرة. ⚠️ يتطلّب طابعة/شبكة فعلية - غير مُختبَر عتادياً هنا.
 */
export function printRaw(opts: RawPrintOptions): Promise<void> {
  const host = opts.host;
  const port = opts.port ?? 9100;
  if (!host) return Promise.reject(new Error("Raw print requires a network printer host"));
  const data = Buffer.from(opts.dataBase64, "base64");
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Raw print timeout"));
    });
    socket.connect(port, host, () => socket.write(data, () => socket.end(() => resolve())));
  });
}
