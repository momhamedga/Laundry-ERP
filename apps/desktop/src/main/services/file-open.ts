import { dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import { scoped } from "../logger.js";
import { importLicense } from "../license/license-service.js";
import { getMainWindow } from "../windows/main-window.js";

const log = scoped("file-open");

/**
 * معالجة الملفّات المرتبطة بالتطبيق (Phase 15.5).
 *
 * كان المُثبِّت يسجّل ‎.laundry/.invoice/.receipt بلا أي معالج في الشيفرة، فالنقر
 * المزدوج يفتح البرنامج ويتجاهل الملفّ (رُصد في تدقيق 15D). أُزيلت تلك
 * الامتدادات وسُجِّل ‎.lkey وحده — وهو الملفّ الوحيد الذي يفتحه العميل فعلاً —
 * مع هذا المعالج الذي يستورده كترخيص مباشرةً.
 */

/** يستخرج أول مسار ‎.lkey من وسائط سطر الأوامر. */
export function findLicenseArg(argv: readonly string[]): string | null {
  for (const a of argv) {
    if (typeof a !== "string" || a.startsWith("-")) continue;
    if (!/\.lkey$/i.test(a)) continue;
    try {
      if (fs.existsSync(a) && fs.statSync(a).isFile()) return a;
    } catch {
      /* مسار غير صالح */
    }
  }
  return null;
}

/**
 * يستورد ملفّ ترخيص فُتح بالنقر المزدوج ويُظهر النتيجة.
 * لا يرمي أبداً — فشل الاستيراد يجب ألّا يُسقط الإقلاع.
 */
export async function handleOpenedFile(argv: readonly string[]): Promise<void> {
  const file = findLicenseArg(argv);
  if (!file) return;

  log.info(`فُتح ملفّ ترخيص: ${path.basename(file)}`);
  const win = getMainWindow();

  let status;
  try {
    status = importLicense(fs.readFileSync(file, "utf8"));
  } catch (err) {
    log.error("تعذّرت قراءة ملفّ الترخيص:", err);
    status = { valid: false, message: "تعذّرت قراءة الملفّ" } as ReturnType<typeof importLicense>;
  }

  const opts = status.valid
    ? {
        type: "info" as const,
        title: "تم التفعيل",
        message: "تم تفعيل الترخيص بنجاح",
        detail:
          `العميل: ${status.payload?.customerName ?? "—"}\n` +
          `النوع: ${status.payload?.type ?? "—"}\n` +
          `الانتهاء: ${status.payload?.expiryDate?.slice(0, 10) ?? "دائم"}`,
        buttons: ["حسناً"],
        noLink: true,
      }
    : {
        type: "error" as const,
        title: "تعذّر التفعيل",
        message: "ملفّ الترخيص مرفوض",
        detail: `${status.message ?? status.reason ?? "سبب غير معروف"}\n\nراجع مورّد النظام.`,
        buttons: ["حسناً"],
        noLink: true,
      };

  await (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts));
}
