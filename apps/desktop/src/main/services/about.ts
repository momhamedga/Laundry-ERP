import { app, clipboard, dialog, shell } from "electron";
import path from "node:path";
import { scoped } from "../logger.js";
import { appIconPath } from "../config.js";
import { branding, buildInfo, companyName, productName, real } from "../branding.js";
import { getMainWindow } from "../windows/main-window.js";
import { getFingerprint, getLicenseStatus } from "../license/license-service.js";
import { readRuntimeConfig, runtimeDir } from "../runtime/index.js";
import { backupDir } from "./backup.js";

const log = scoped("about");

/**
 * حوار «عن التطبيق» (Phase 15B، اكتمل في 15.5).
 *
 * كان قبل 15B يكتب سطراً في السجلّ ولا يعرض شيئاً. الآن يعرض هوية المنتج
 * والإصدار وبصمة الالتزام وتاريخ البناء وحالة الترخيص ومعرّف الجهاز وبيانات
 * الدعم، ويفتح المجلّدات الثلاثة التي يطلبها الدعم الفني عادةً.
 *
 * كل النصوص التجارية تأتي من branding.config.json — لا نصّ مُصلَّب هنا.
 */

/** ملخّص تقني يُنسخ ويُرسل للدعم — يختصر جولة الأسئلة الأولى. */
export function buildSupportSummary(): string {
  const s = getLicenseStatus();
  const b = buildInfo();
  const rt = readRuntimeConfig();
  const lines = [
    `المنتج        : ${productName()} v${app.getVersion()}`,
    `البناء        : ${b.commit}${b.dirty ? "+dirty" : ""} — ${b.buildDate.slice(0, 19).replace("T", " ")}`,
    `النظام        : ${process.platform} ${process.arch}`,
    `Electron      : ${process.versions.electron} / Chrome ${process.versions.chrome}`,
    `إعداد التشغيل : schema ${rt?.schemaVersion ?? "?"} · install ${rt?.installId?.slice(0, 8) ?? "—"}`,
    `الترخيص       : ${s.valid ? "مُفعَّل" : s.inGrace ? `فترة سماح (${s.graceDaysRemaining} يوم)` : "غير مُفعَّل"}`,
  ];
  if (s.payload) {
    lines.push(`العميل        : ${s.payload.customerName}`);
    lines.push(`النوع         : ${s.payload.type}`);
    lines.push(`الانتهاء      : ${s.payload.expiryDate?.slice(0, 10) ?? "دائم"}`);
    lines.push(`رقم الترخيص   : ${s.payload.licenseId}`);
  }
  if (!s.valid) lines.push(`سبب عدم التفعيل: ${s.reason ?? "?"}`);
  // معرّف الجهاز من العتاد لا من الترخيص: العميل غير المُفعَّل أكثر من يحتاجه
  lines.push(`معرّف الجهاز  : ${getFingerprint().machineId}`);
  lines.push(`التاريخ       : ${new Date().toISOString()}`);
  return lines.join("\n");
}

export function showAboutDialog(): void {
  const b = branding();
  const info = buildInfo();
  const s = getLicenseStatus();
  const win = getMainWindow();

  const company = real(b.company?.name);
  const website = real(b.company?.website);
  const email = real(b.support?.email);
  const phone = real(b.support?.phone);
  const hours = real(b.support?.hours);
  const machineId = getFingerprint().machineId;

  const detail: string[] = [];
  // الحوار عربي بالكامل — نفضّل الشعار العربي إن وُجد
  const tagline = real(b.product?.taglineAr) ?? real(b.product?.tagline);
  if (tagline) detail.push(tagline);
  detail.push("");
  detail.push(`الإصدار      : ${app.getVersion()}${real(b.product?.edition) ? ` ${b.product.edition}` : ""}`);
  detail.push(`الالتزام     : ${info.commit}${info.dirty ? " (غير ملتزم)" : ""}`);
  detail.push(`تاريخ البناء : ${info.buildDate === "unknown" ? "غير معروف" : info.buildDate.slice(0, 10)}`);
  detail.push(`نظام التشغيل : schema ${info.runtimeSchemaVersion} · ${process.platform} ${process.arch}`);
  detail.push(`Electron     : ${process.versions.electron}`);
  detail.push("");
  detail.push(
    `الترخيص      : ${
      s.valid
        ? `مُفعَّل — ${s.payload?.customerName ?? ""}${s.payload?.expiryDate ? ` (ينتهي ${s.payload.expiryDate.slice(0, 10)})` : " (دائم)"}`
        : s.inGrace
          ? `فترة سماح — متبقٍّ ${s.graceDaysRemaining} يوماً`
          : "غير مُفعَّل"
    }`,
  );
  detail.push(`معرّف الجهاز : ${machineId}`);
  if (company) {
    detail.push("");
    detail.push(`المورّد      : ${company}`);
  }
  const support = [email && `البريد       : ${email}`, phone && `الهاتف       : ${phone}`, website && `الموقع       : ${website}`, hours && `أوقات العمل  : ${hours}`]
    .filter(Boolean)
    .join("\n");
  if (support) {
    detail.push("");
    detail.push("الدعم الفني:");
    detail.push(support);
  }
  if (real(b.legal?.copyright)) {
    detail.push("");
    detail.push(`${b.legal.copyright} ${companyName()}`.trim());
  }

  // الأزرار تُبنى ديناميكياً كي لا يظهر «زيارة الموقع» بلا موقع مضبوط
  const actions: { label: string; run: () => void }[] = [
    { label: "نسخ بيانات الدعم", run: () => copyText(buildSupportSummary(), "ملخّص الدعم") },
    { label: "نسخ معرّف الجهاز", run: () => copyText(machineId, "معرّف الجهاز") },
    { label: "فتح السجلّات", run: () => void shell.openPath(app.getPath("logs")) },
    { label: "فتح مجلّد الإعداد", run: () => void shell.openPath(runtimeDir()) },
    { label: "فتح النسخ الاحتياطي", run: () => void shell.openPath(safeBackupsDir()) },
  ];
  if (website) actions.push({ label: "زيارة الموقع", run: () => void shell.openExternal(website) });

  const opts = {
    type: "info" as const,
    title: "عن التطبيق",
    message: real(b.product?.nameAr) ?? productName(),
    detail: detail.join("\n"),
    buttons: ["إغلاق", ...actions.map((a) => a.label)],
    defaultId: 0,
    cancelId: 0,
    icon: appIconPath() ?? undefined,
    noLink: true,
  };

  const handle = (res: { response: number }): void => {
    const action = actions[res.response - 1];
    if (!action) return;
    action.run();
    // الحوار حلقة: بعد أي إجراء نعيد فتحه كي يتمكّن المستخدم من إجراء آخر
    setTimeout(() => showAboutDialog(), 150);
  };

  void (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts)).then(handle);
}

function copyText(text: string, what: string): void {
  clipboard.writeText(text);
  log.info(`${what} نُسخ إلى الحافظة`);
}

/** مجلّد النسخ الاحتياطي، وإلا مجلّد بيانات المستخدم. */
function safeBackupsDir(): string {
  try {
    return backupDir();
  } catch {
    return path.join(app.getPath("userData"), "backups");
  }
}
