"use client";

import { formatCurrency } from "@/lib/format";
import type { LabelTemplate } from "@/types/barcode";
import type { BarcodeType } from "@/types/barcode";
import type { PrintQueueItem } from "@/store/print-queue-store";
import { BarcodeImage } from "./barcode-image";

/** تهيئة عرض الملصق - إما قالب كامل أو أعلام افتراضية */
export interface LabelConfig {
  showName: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showQr: boolean;
  showPrice: boolean;
  showCategory: boolean;
  showCompanyName: boolean;
}

export function templateToConfig(t: LabelTemplate | null): LabelConfig {
  if (!t) {
    return {
      showName: true,
      showSku: true,
      showBarcode: true,
      showQr: false,
      showPrice: true,
      showCategory: false,
      showCompanyName: true,
    };
  }
  return {
    showName: t.showName,
    showSku: t.showSku,
    showBarcode: t.showBarcode,
    showQr: t.showQr,
    showPrice: t.showPrice,
    showCategory: t.showCategory,
    showCompanyName: t.showCompanyName,
  };
}

interface LabelPreviewProps {
  item: PrintQueueItem;
  config: LabelConfig;
  companyName: string;
}

/** ملصق واحد قابل للطباعة - يُرسَم بالمتصفح (JsBarcode/qrcode) */
export function LabelPreview({ item, config, companyName }: LabelPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded border bg-white p-2 text-center text-black">
      {config.showCompanyName && <div className="text-[10px] font-semibold">{companyName}</div>}
      {config.showName && <div className="text-xs font-medium leading-tight">{item.name}</div>}
      {config.showCategory && item.category && <div className="text-[10px] text-gray-600">{item.category}</div>}
      {config.showBarcode && item.barcode && item.barcodeType && item.barcodeType !== "QR" && (
        <BarcodeImage value={item.barcode} type={item.barcodeType as BarcodeType} height={38} />
      )}
      {config.showQr && item.qrCode && <BarcodeImage value={item.qrCode} type="QR" qrSize={72} />}
      {config.showSku && <div dir="ltr" className="font-mono text-[10px]">{item.sku}</div>}
      {config.showPrice && <div className="text-xs font-bold">{formatCurrency(item.price)}</div>}
    </div>
  );
}
