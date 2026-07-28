"use client";

import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import type { BarcodeType } from "@/types/barcode";

/** خريطة نوعنا → تنسيق JsBarcode */
const JSBARCODE_FORMAT: Record<Exclude<BarcodeType, "QR">, string> = {
  CODE128: "CODE128",
  CODE39: "CODE39",
  EAN13: "EAN13",
  EAN8: "EAN8",
  UPC: "UPC",
};

interface BarcodeImageProps {
  value: string;
  type: BarcodeType;
  /** ارتفاع أعمدة الباركود الخطّي (px) */
  height?: number;
  /** حجم QR (px) */
  qrSize?: number;
  showValueText?: boolean;
  className?: string;
}

/**
 * يرسم باركود خطّي (JsBarcode → SVG) أو QR (qrcode → dataURL) في المتصفح.
 * كل الرسم بالعميل - لا رسم على الخادم (يتجنّب اعتماد canvas بالخلفية).
 */
export function BarcodeImage({
  value,
  type,
  height = 50,
  qrSize = 96,
  showValueText = true,
  className,
}: BarcodeImageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (type === "QR") {
      QRCode.toDataURL(value, { width: qrSize, margin: 1 })
        .then((url) => {
          if (cancelled) return;
          setQrUrl(url);
          setError(false);
        })
        .catch(() => !cancelled && setError(true));
      return () => {
        cancelled = true;
      };
    }
    // الرسم داخل rAF - يتفادى setState متزامناً داخل جسم الـeffect (renders متتالية)
    const raf = requestAnimationFrame(() => {
      if (cancelled || !svgRef.current) return;
      try {
        JsBarcode(svgRef.current, value, {
          format: JSBARCODE_FORMAT[type],
          height,
          displayValue: showValueText,
          fontSize: 12,
          margin: 4,
        });
        setError(false);
      } catch {
        setError(true);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [value, type, height, qrSize, showValueText]);

  if (error) {
    return <span className="text-xs text-destructive">قيمة غير صالحة للرسم</span>;
  }

  if (type === "QR") {
    // eslint-disable-next-line @next/next/no-img-element
    return qrUrl ? <img src={qrUrl} alt={value} width={qrSize} height={qrSize} className={className} /> : null;
  }
  return <svg ref={svgRef} className={className} />;
}
