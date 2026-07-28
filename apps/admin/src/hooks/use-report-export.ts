"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getBlobErrorMessage } from "@/lib/axios";
import * as exportService from "@/services/report-export.service";
import type { ExportFiltersByType, ExportReportType } from "@/types/report-export";

/**
 * تصدير تقرير - أربع طفرات (CSV/Excel/PDF/Print) مربوطة بنوع تقرير واحد ثابت.
 * كل طفرة تأخذ الفلاتر الفعّالة لحظة الضغط (تُمرَّر من العرض) فتطابق تماماً ما
 * يراه المستخدم على الشاشة. Toast نجاح/فشل + isPending لحالة التحميل/التعطيل
 * بالزر. أخطاء Blob تُقرأ عبر getBlobErrorMessage المشترك (نفس نمط الفاتورة).
 */
export function useReportExport<T extends ExportReportType>(type: T) {
  type Filters = ExportFiltersByType[T];

  const onError = (error: unknown) => {
    void getBlobErrorMessage(error).then((message) => toast.error(message));
  };

  const csv = useMutation({
    mutationFn: (filters: Filters) => exportService.exportReportCsv(type, filters),
    onSuccess: () => toast.success("تم تصدير ملف CSV"),
    onError,
  });

  const excel = useMutation({
    mutationFn: (filters: Filters) => exportService.exportReportExcel(type, filters),
    onSuccess: () => toast.success("تم تصدير ملف Excel"),
    onError,
  });

  const pdf = useMutation({
    mutationFn: (filters: Filters) => exportService.exportReportPdf(type, filters),
    onSuccess: () => toast.success("تم فتح ملف PDF بتبويب جديد"),
    onError,
  });

  const print = useMutation({
    mutationFn: (filters: Filters) => exportService.exportReportPrint(type, filters),
    onSuccess: () => toast.success("تم فتح نافذة الطباعة"),
    onError,
  });

  return { csv, excel, pdf, print };
}
