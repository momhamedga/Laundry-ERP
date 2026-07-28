import type {
  AlertType,
  InventoryItemType,
  InventoryUnit,
  MovementType,
  PurchaseStatus,
} from "@/types/inventory";

export const ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
  PRODUCT: "منتج",
  RAW_MATERIAL: "مادة خام",
};

export const UNIT_LABELS: Record<InventoryUnit, string> = {
  PIECE: "قطعة",
  KG: "كجم",
  GRAM: "جرام",
  LITER: "لتر",
  METER: "متر",
  BOX: "صندوق",
  PACK: "عبوة",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: "إدخال",
  OUT: "إخراج",
  RETURN: "مرتجع",
  ADJUSTMENT: "تسوية",
  LOSS: "هالك",
  TRANSFER: "تحويل",
  OPENING: "افتتاحي",
  CLOSING: "ختامي",
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: "مسودة",
  ORDERED: "مطلوب",
  RECEIVED: "مستلم",
  CANCELLED: "ملغي",
};

export const ALERT_LABELS: Record<AlertType, string> = {
  LOW_STOCK: "نقص مخزون",
  OUT_OF_STOCK: "نفاد مخزون",
};

/** رقم منسّق بلا كسور زائدة (الكميات Decimal تصل كنص) */
export function fmtQty(value: string | number): string {
  return Number(value).toLocaleString("ar-EG", { maximumFractionDigits: 3 });
}
