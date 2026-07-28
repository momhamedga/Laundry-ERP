/**
 * يفتح Blob بتبويب جديد - المتصفح يعرضه حسب نوعه (PDF/HTML) دون أي إعادة بناء
 * بالواجهة. autoPrint يفتح حوار الطباعة تلقائياً (لمسارات "طباعة"). مُشترَك بين
 * مستندات الفاتورة وإيصالات الدفع (لا تكرار).
 */
export function openBlobInNewTab(blob: Blob, autoPrint = false): void {
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank");
  if (autoPrint && tab) {
    tab.addEventListener("load", () => tab.print());
  }
  // لا نُلغي الـ URL فوراً - التبويب الجديد لا يزال يحتاجه للعرض
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
