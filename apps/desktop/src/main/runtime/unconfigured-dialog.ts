import { app, dialog, shell } from "electron";
import { scoped } from "../logger.js";
import { importProvisioning, runtimeDir } from "./index.js";

const log = scoped("runtime");

/**
 * حوار «الجهاز غير مُجهَّز» (Phase 15C).
 *
 * قبل هذه المرحلة كان نقص الإعداد يُنتج ستّ محاولات فاشلة للـ API ثم تطبيقاً
 * ميتاً بلا رسالة. الآن نتوقّف فوراً، نشرح ما ينقص، ونعطي مسار إنقاذ: استيراد
 * ملفّ تجهيز من المطوّر مباشرةً من داخل الحوار ثم إعادة التشغيل.
 */
export async function showUnconfiguredDialog(missing: string[]): Promise<void> {
  const human: Record<string, string> = {
    DATABASE_URL: "رابط قاعدة البيانات",
    JWT_ACCESS_SECRET: "مفتاح الجلسات",
    JWT_REFRESH_SECRET: "مفتاح تجديد الجلسات",
  };
  const list = missing.map((m) => `  • ${human[m] ?? m}`).join("\n");

  log.error(`الجهاز غير مُجهَّز — ناقص: ${missing.join(", ")}`);

  const res = await dialog.showMessageBox({
    type: "error",
    title: "الجهاز غير مُجهَّز",
    message: "لم يكتمل تجهيز هذا الجهاز",
    detail:
      `لا يستطيع البرنامج الإقلاع لأن الإعداد التالي غير موجود:\n\n${list}\n\n` +
      "هذه خطوة يقوم بها مورّد النظام مرّة واحدة عند التركيب.\n\n" +
      "إن كان معك ملفّ التجهيز الذي أرسله المورّد (بامتداد ‎.json)، " +
      "اضغط «استيراد ملفّ التجهيز» ثم أعد تشغيل البرنامج.",
    buttons: ["استيراد ملفّ التجهيز", "فتح مجلّد الإعداد", "إغلاق"],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });

  if (res.response === 0) {
    const pick = await dialog.showOpenDialog({
      title: "اختر ملفّ التجهيز",
      filters: [{ name: "ملفّ تجهيز", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (!pick.canceled && pick.filePaths[0]) {
      const out = importProvisioning(pick.filePaths[0]);
      if (out.ok && out.missing.length === 0) {
        await dialog.showMessageBox({
          type: "info",
          title: "اكتمل التجهيز",
          message: "تم تجهيز الجهاز بنجاح",
          detail: "سيُعاد تشغيل البرنامج الآن.",
          buttons: ["إعادة التشغيل"],
          noLink: true,
        });
        app.relaunch();
        app.exit(0);
        return;
      }
      await dialog.showMessageBox({
        type: "error",
        title: "تعذّر التجهيز",
        message: out.ok ? "الملفّ لا يحتوي كل الإعدادات المطلوبة" : out.error,
        detail: out.ok ? `ما زال ناقصاً: ${out.missing.join(", ")}` : "راجع مورّد النظام.",
        buttons: ["إغلاق"],
        noLink: true,
      });
    }
  } else if (res.response === 1) {
    await shell.openPath(runtimeDir());
  }

  app.exit(1);
}
