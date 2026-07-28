"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployeesQuery } from "@/hooks/use-employees";

interface Props {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

/** منتقي موظف مشترك عبر تبويبات HR - يقرأ قائمة الموظفين النشطة */
export function EmployeeSelect({ value, onChange, placeholder = "اختر موظفاً", className }: Props) {
  const query = useEmployeesQuery({ limit: 100 });
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className={className ?? "w-56"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(query.data?.employees ?? []).map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.user.name}
            {e.jobTitle ? ` — ${e.jobTitle}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
