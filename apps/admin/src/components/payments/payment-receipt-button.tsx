"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePaymentReceiptQuery } from "@/hooks/use-payments";
import { getErrorMessage } from "@/lib/axios";
import { openBlobInNewTab } from "@/lib/open-blob";
import type { PaymentTxStatus } from "@/types/payment";
import toast from "react-hot-toast";

interface PaymentReceiptButtonProps {
  paymentId: string;
  status: PaymentTxStatus;
  /** icon = زر أيقونة مضغوط (صفوف الجدول)، default = زر بنص (لوحة التفاصيل) */
  variant?: "default" | "icon";
}

/**
 * زر "طباعة إيصال" قابل لإعادة الاستخدام (لوحة تفاصيل الدفعة + صفوف جدول
 * مدفوعات الفاتورة). يظهر فقط لدفعة COMPLETED/REFUNDED (الخادم يرفض غيرها).
 * يفتح إيصال HTML الحقيقي بتبويب جديد ويطبعه تلقائياً - بلا إعادة بناء Template.
 */
export function PaymentReceiptButton({ paymentId, status, variant = "default" }: PaymentReceiptButtonProps) {
  const receiptQuery = usePaymentReceiptQuery(paymentId);
  const [loading, setLoading] = useState(false);

  if (status !== "COMPLETED" && status !== "REFUNDED") return null;

  async function handlePrint() {
    setLoading(true);
    try {
      const result = await receiptQuery.refetch();
      if (result.data) openBlobInNewTab(result.data, true);
      else if (result.error) toast.error(getErrorMessage(result.error));
    } finally {
      setLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="طباعة إيصال الدفعة"
        disabled={loading}
        onClick={() => void handlePrint()}
      >
        {loading ? <Spinner className="size-3.5" /> : <Printer aria-hidden />}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={() => void handlePrint()}>
      {loading ? <Spinner className="size-3.5" /> : <Printer aria-hidden />} طباعة إيصال
    </Button>
  );
}
