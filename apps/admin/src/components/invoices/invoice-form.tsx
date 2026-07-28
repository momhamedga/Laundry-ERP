"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface StatusOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface InvoiceFormProps {
  statusValue: string;
  onStatusChange: (value: string) => void;
  statusOptions: readonly StatusOption[];
  taxRegister: UseFormRegisterReturn;
  taxError?: string;
  dueDateRegister: UseFormRegisterReturn;
  notesRegister: UseFormRegisterReturn;
  notesError?: string;
}

/**
 * الحقول المشتركة بين إنشاء وتعديل الفاتورة (status/tax/dueDate/notes) -
 * orderId خاص بالإنشاء فقط (غير قابل للتعديل لاحقاً بالخادم) فيبقى خارج هذا المكوّن
 */
export function InvoiceForm({
  statusValue,
  onStatusChange,
  statusOptions,
  taxRegister,
  taxError,
  dueDateRegister,
  notesRegister,
  notesError,
}: InvoiceFormProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="invoice-form-status">الحالة *</Label>
        <Select
          value={statusValue}
          onValueChange={(v) => onStatusChange(v ?? statusOptions[0]?.value ?? "")}
          items={Object.fromEntries(statusOptions.map((s) => [s.value, s.label]))}
        >
          <SelectTrigger id="invoice-form-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value} disabled={s.disabled}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invoice-form-tax">الضريبة *</Label>
        <Input
          id="invoice-form-tax"
          type="number"
          min="0"
          step="0.01"
          dir="ltr"
          aria-invalid={!!taxError}
          {...taxRegister}
        />
        {taxError && (
          <p role="alert" className="text-xs text-destructive">
            {taxError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invoice-form-due-date">تاريخ الاستحقاق</Label>
        <Input id="invoice-form-due-date" type="date" {...dueDateRegister} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invoice-form-notes">ملاحظات</Label>
        <Textarea id="invoice-form-notes" rows={3} {...notesRegister} />
        {notesError && (
          <p role="alert" className="text-xs text-destructive">
            {notesError}
          </p>
        )}
      </div>
    </>
  );
}
