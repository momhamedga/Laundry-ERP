import type { BarcodeType, LabelSize, ScanAction } from "@/types/barcode";

export const BARCODE_TYPE_LABELS: Record<BarcodeType, string> = {
  CODE128: "Code128",
  CODE39: "Code39",
  EAN13: "EAN-13",
  EAN8: "EAN-8",
  UPC: "UPC",
  QR: "QR Code",
};

export const LABEL_SIZE_LABELS: Record<LabelSize, string> = {
  A4: "A4 (ورقة)",
  THERMAL_58: "حراري 58مم",
  THERMAL_80: "حراري 80مم",
  CUSTOM: "مخصّص",
};

export const SCAN_ACTION_LABELS: Record<ScanAction, string> = {
  VIEW: "عرض",
  ADJUST: "تعديل رصيد",
  MOVEMENT: "حركة",
  RECEIVE: "استلام",
  SELL: "بيع",
  TRANSFER: "تحويل",
  COUNT: "جرد",
  LOOKUP: "بحث",
};

/** مقاسات الملصق بالملّيمتر (عرض×ارتفاع) للطباعة */
export const LABEL_SIZE_MM: Record<LabelSize, { w: number; h: number }> = {
  A4: { w: 60, h: 40 },
  THERMAL_58: { w: 58, h: 40 },
  THERMAL_80: { w: 80, h: 50 },
  CUSTOM: { w: 60, h: 40 },
};
