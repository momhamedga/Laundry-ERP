"use client";

import { Download, FileSpreadsheet, FileText, Printer, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useReportExport } from "@/hooks/use-report-export";
import { usePermissions } from "@/hooks/use-permissions";
import type { ExportFiltersByType, ExportReportType } from "@/types/report-export";

interface ExportDropdownProps<T extends ExportReportType> {
  /** نوع التقرير - يُحدِّد المسار والأعمدة بالخادم */
  type: T;
  /** الفلاتر الفعّالة حالياً على الشاشة - تُرسَل كما هي للتصدير (بلا page/limit) */
  filters: ExportFiltersByType[T];
  /** تعطيل إضافي (مثلاً أثناء تحميل التقرير نفسه) */
  disabled?: boolean;
}

/**
 * قائمة تصدير التقرير - CSV / Excel / PDF / طباعة. كل بند يُصدِّر بنفس فلاتر
 * التقرير المعروض حالياً. حالة تحميل + تعطيل أثناء التصدير لكل بند، وToast
 * نجاح/فشل عبر useReportExport. reports:view نفس صلاحية عرض التقارير (لا
 * صلاحية جديدة) - يُخفى الزر كلياً لمن لا يملكها.
 */
export function ExportDropdown<T extends ExportReportType>({
  type,
  filters,
  disabled = false,
}: ExportDropdownProps<T>) {
  const { can } = usePermissions();
  const { csv, excel, pdf, print } = useReportExport(type);

  if (!can("reports:view")) return null;

  const isExporting = csv.isPending || excel.isPending || pdf.isPending || print.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled || isExporting}>
            {isExporting ? <Spinner className="size-3.5" /> : <Download aria-hidden />}
            تصدير
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>تصدير التقرير</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isExporting} onClick={() => csv.mutate(filters)}>
          {csv.isPending ? <Spinner className="size-4" /> : <Table2 aria-hidden />}
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isExporting} onClick={() => excel.mutate(filters)}>
          {excel.isPending ? <Spinner className="size-4" /> : <FileSpreadsheet aria-hidden />}
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isExporting} onClick={() => pdf.mutate(filters)}>
          {pdf.isPending ? <Spinner className="size-4" /> : <FileText aria-hidden />}
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isExporting} onClick={() => print.mutate(filters)}>
          {print.isPending ? <Spinner className="size-4" /> : <Printer aria-hidden />}
          طباعة
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
