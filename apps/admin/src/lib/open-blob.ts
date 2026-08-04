import { desktopBridge } from "@/lib/desktop";

/**
 * يفتح Blob (فاتورة PDF / إيصال دفع) للعرض أو الطباعة.
 *
 * ═══════════ لماذا مساران ═══════════
 * في المتصفّح: تبويب جديد بـ blob: — يعرضه المتصفّح بعارضه المدمج.
 *
 * في تطبيق سطح المكتب: نمرّر الملفّ للعملية الرئيسية لتفتحه **بعارض النظام
 * الافتراضي**. السبب أن عارض PDF المدمج في Chromium لا يرسم داخل نافذة Electron
 * (نافذة `blob:` كانت تُفتح فارغة تماماً حتى بعد تفعيل `plugins`)، فتعطّلت
 * «عرض PDF» و«تنزيل» و«طباعة» في النسخة المُغلَّفة.
 *
 * وهذا أفضل للمستخدم أصلاً: يحصل على برنامج القراءة المألوف لديه بأدوات
 * الطباعة والحفظ والتكبير الكاملة، بدل عارض محدود داخل التطبيق.
 */
export async function openBlobInNewTab(
  blob: Blob,
  autoPrint = false,
  fileName = "document.pdf",
): Promise<void> {
  const bridge = desktopBridge();

  if (bridge?.system?.openDocument) {
    try {
      await bridge.system.openDocument(await blobToBase64(blob), fileName);
      return;
    } catch {
      // إن تعذّر فتح عارض النظام نُكمل بالمسار العام أدناه بدل ترك المستخدم بلا شيء
    }
  }

  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank");
  if (autoPrint && tab) {
    tab.addEventListener("load", () => tab.print());
  }
  // لا نُلغي الـ URL فوراً - التبويب الجديد لا يزال يحتاجه للعرض
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** يحوّل Blob إلى base64 خام (بلا بادئة data:) لتمريره عبر IPC. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذّرت قراءة الملفّ"));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
