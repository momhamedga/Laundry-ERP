import type { BarcodeType } from "@prisma/client";

/**
 * محرّك قيم الباركود (Phase 8) - توليد/تحقّق قيم فقط (بلا رسم صور - الرسم بالواجهة
 * عبر JsBarcode/qrcode). المجاميع الاختبارية (EAN/UPC) منطق خالص بلا أي مكتبة.
 */

/** مجموع اختباري EAN/UPC القياسي - أوزان 1 و3 بالتناوب من اليمين */
function eanChecksum(digits: string): number {
  let sum = 0;
  // من اليمين لليسار: أول رقم وزنه 3
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    const d = Number(reversed[i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

/** يولّد قيمة باركود صالحة للنوع المطلوب (auto) */
export function generateBarcodeValue(type: BarcodeType, seed?: string): string {
  switch (type) {
    case "EAN13": {
      // بادئة "2" = استخدام داخلي بالمتجر (اصطلاح GS1) + 11 رقماً + خانة تحقّق
      const base = "2" + randomDigits(11);
      return base + eanChecksum(base);
    }
    case "EAN8": {
      const base = "2" + randomDigits(6);
      return base + eanChecksum(base);
    }
    case "UPC": {
      // UPC-A: 11 رقماً + خانة تحقّق (بادئة داخلية 0)
      const base = "0" + randomDigits(10);
      return base + eanChecksum(base);
    }
    case "CODE39": {
      // CODE39: أحرف كبيرة/أرقام فقط - نشتق من seed (SKU) وإلا عشوائي
      const s = (seed ?? "").toUpperCase().replace(/[^A-Z0-9\-.$/+% ]/g, "");
      return s.length >= 3 ? s : "ITM" + randomDigits(9);
    }
    case "CODE128": {
      const s = (seed ?? "").trim();
      return s.length >= 3 ? s : "ITM" + randomDigits(9);
    }
    case "QR": {
      // حمولة QR = SKU (round-trip موثوق مع بحث المسح) أو معرّف عشوائي
      return (seed ?? "").trim() || "ITM" + randomDigits(9);
    }
  }
}

/** يتحقّق أن قيمة تطابق قواعد نوعها (يُستخدم للتوليد اليدوي وتقرير Invalid Barcode) */
export function isValidBarcodeValue(type: BarcodeType, value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  switch (type) {
    case "EAN13":
      return /^\d{13}$/.test(v) && Number(v[12]) === eanChecksum(v.slice(0, 12));
    case "EAN8":
      return /^\d{8}$/.test(v) && Number(v[7]) === eanChecksum(v.slice(0, 7));
    case "UPC":
      return /^\d{12}$/.test(v) && Number(v[11]) === eanChecksum(v.slice(0, 11));
    case "CODE39":
      return /^[A-Z0-9\-.$/+% ]+$/.test(v) && v.length <= 60;
    case "CODE128":
      // CODE128 يدعم ASCII الكامل (طباعة) - نحصر الطول فقط
      // eslint-disable-next-line no-control-regex
      return /^[\x20-\x7E]+$/.test(v) && v.length <= 80;
    case "QR":
      return v.length <= 1000;
  }
}

/** توليد SKU عشوائي فريد الشكل (لا يمسّ قاعدة البيانات - الخدمة تتحقق من التفرّد) */
export function generateRandomSku(prefix = "SKU"): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${stamp}${rand}`;
}
