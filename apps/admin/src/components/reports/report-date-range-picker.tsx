"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getReportDateRangeError } from "@/lib/validations/report";

interface ReportDateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

/**
 * from/to حقيقيان بكل الستة تقارير - بلا نطاق افتراضي ثابت (يطابق الخادم حرفياً)
 * تحقق فوري (from <= to) بالواجهة فقط - المصدر الحقيقي يبقى رفض الخادم 400
 */
export function ReportDateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: ReportDateRangePickerProps) {
  const error = getReportDateRangeError(from, to);

  return (
    <div className="space-y-1.5">
      <div className="space-y-1.5">
        <Label htmlFor="report-date-from">من تاريخ</Label>
        <Input
          id="report-date-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="report-date-to">إلى تاريخ</Label>
        <Input
          id="report-date-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
