import bwipjs from "bwip-js";
import QRCode from "qrcode";

/**
 * QR/Barcode يُولَّدان وقت الطلب فقط - لا حقل تخزين بالـSchema (راجع القرارات
 * المعمارية بالتقرير: كلاهما مُشتق بالكامل من بيانات الفاتورة الموجودة أصلاً،
 * تخزينهما تكرار بيانات بلا داعٍ)
 */

/**
 * محتوى QR نص مُهيكَل (رقم الفاتورة/الطلب/الإجمالي) - لا رابط تحقق وهمي لصفحة
 * غير موجودة بالمشروع (لا Portal تحقق فواتير حالياً)
 */
export async function generateInvoiceQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, { errorCorrectionLevel: "M", margin: 1, width: 160 });
}

/**
 * Barcode Code128 يعتمد على رقم الفاتورة مباشرة كما طُلب - toDataURL غير
 * متاحة ببناء bwip-js لـNode (فقط بناء المتصفح)، لذا نُرمِّز toBuffer يدوياً
 */
export async function generateInvoiceBarcodeDataUrl(invoiceNumber: string): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: invoiceNumber,
    scale: 2,
    height: 12,
    includetext: false,
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}
