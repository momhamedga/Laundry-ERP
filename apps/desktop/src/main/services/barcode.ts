import bwipjs from "bwip-js";
import QRCode from "qrcode";
import { scoped } from "../logger.js";
import type {
  BarcodeSymbology,
  GenerateBarcodeOptions,
  ScanValidation,
} from "../../shared/ipc.js";

const log = scoped("barcode");

/**
 * توليد الباركود/QR محلّياً للطباعة دون إنترنت (Phase 11.6D) + التحقّق من المسح.
 * منطق المجاميع الاختبارية (EAN/UPC) خالص بلا مكتبة — مطابق لمحرّك قيم الـ API
 * (لا يغيّر الـ API). الرسم عبر bwip-js (بناء Node) و qrcode، وكلاهما JS خالص.
 */

/** مجموع اختباري EAN/UPC القياسي (أوزان 1 و3 بالتناوب من اليمين). */
function eanChecksum(digits: string): number {
  const reversed = digits.split("").reverse();
  let sum = 0;
  for (let i = 0; i < reversed.length; i++) {
    const d = Number(reversed[i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

/** يتحقّق أن قيمة تطابق قواعد نوعها (طول + مجموع اختباري للأنواع الرقمية). */
export function isValidBarcodeValue(type: BarcodeSymbology, value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  switch (type) {
    case "ean13":
      return /^\d{13}$/.test(v) && Number(v[12]) === eanChecksum(v.slice(0, 12));
    case "ean8":
      return /^\d{8}$/.test(v) && Number(v[7]) === eanChecksum(v.slice(0, 7));
    case "upca":
      return /^\d{12}$/.test(v) && Number(v[11]) === eanChecksum(v.slice(0, 11));
    case "code39":
      return /^[A-Z0-9\-.$/+% ]+$/.test(v) && v.length <= 60;
    case "code128":
      return /^[\x20-\x7E]+$/.test(v) && v.length <= 80;
    case "qrcode":
      return v.length <= 1000;
  }
}

/**
 * يستنتج نوع الرمز الممسوح ويتحقّق منه (لأجهزة USB التي ترسل القيمة فقط بلا نوع).
 * الأرقام: 13/12/8 خانة → EAN/UPC بمجموع اختباري؛ غير ذلك → code128 عام.
 */
export function validateScan(value: string): ScanValidation {
  const v = value.trim();
  if (v.length === 0) return { value: v, valid: false, type: null };
  const digitsOnly = /^\d+$/.test(v);
  if (digitsOnly && v.length === 13) return { value: v, valid: isValidBarcodeValue("ean13", v), type: "ean13" };
  if (digitsOnly && v.length === 12) return { value: v, valid: isValidBarcodeValue("upca", v), type: "upca" };
  if (digitsOnly && v.length === 8) return { value: v, valid: isValidBarcodeValue("ean8", v), type: "ean8" };
  return { value: v, valid: isValidBarcodeValue("code128", v), type: "code128" };
}

const BWIP_BCID: Record<Exclude<BarcodeSymbology, "qrcode">, string> = {
  code128: "code128",
  code39: "code39",
  ean13: "ean13",
  ean8: "ean8",
  upca: "upca",
};

/**
 * يولّد صورة الباركود/QR كـ data URL (PNG). QR عبر qrcode؛ الباقي عبر bwip-js.
 * يُتحقّق من صحّة القيمة للأنواع الرقمية قبل الرسم (bwip-js يرمي على قيمة غير صالحة).
 */
export async function generateBarcode(opts: GenerateBarcodeOptions): Promise<string> {
  const { text, symbology } = opts;
  if (!text || typeof text !== "string") throw new Error("text is required");

  if (symbology === "qrcode") {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: opts.margin ?? 1,
      width: opts.width ?? 200,
    });
  }

  if (!isValidBarcodeValue(symbology, text)) {
    throw new Error(`invalid ${symbology} value: ${text}`);
  }
  const png = await bwipjs.toBuffer({
    bcid: BWIP_BCID[symbology],
    text,
    scale: opts.scale ?? 2,
    height: opts.height ?? 12,
    includetext: opts.includetext ?? true,
    textxalign: "center",
  });
  log.info(`generated ${symbology} (${png.length} bytes)`);
  return `data:image/png;base64,${png.toString("base64")}`;
}
