"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEmployeeMutation, useUpdateEmployeeMutation } from "@/hooks/use-employees";
import { useUsersQuery } from "@/hooks/use-users";
import type { ContractType, EmployeeView } from "@/types/employee";

interface Props {
  employee: EmployeeView | null; // null = إنشاء
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONTRACT_LABELS: Record<ContractType, string> = {
  FULL_TIME: "دوام كامل",
  PART_TIME: "دوام جزئي",
  CONTRACT: "عقد",
  TEMPORARY: "مؤقت",
};

interface FormState {
  userId: string;
  employeeCode: string;
  jobTitle: string;
  department: string;
  employmentType: ContractType;
  hireDate: string;
  nationalId: string;
  personalPhone: string;
  personalEmail: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  baseSalary: string;
  contractUrl: string;
  idCardUrl: string;
  photoUrl: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    userId: "",
    employeeCode: "",
    jobTitle: "",
    department: "",
    employmentType: "FULL_TIME",
    hireDate: "",
    nationalId: "",
    personalPhone: "",
    personalEmail: "",
    address: "",
    emergencyName: "",
    emergencyPhone: "",
    baseSalary: "",
    contractUrl: "",
    idCardUrl: "",
    photoUrl: "",
    notes: "",
  };
}

function fromEmployee(e: EmployeeView): FormState {
  return {
    userId: e.userId,
    employeeCode: e.employeeCode ?? "",
    jobTitle: e.jobTitle ?? "",
    department: e.department ?? "",
    employmentType: e.employmentType,
    hireDate: e.hireDate ? e.hireDate.slice(0, 10) : "",
    nationalId: e.nationalId ?? "",
    personalPhone: e.personalPhone ?? "",
    personalEmail: e.personalEmail ?? "",
    address: e.address ?? "",
    emergencyName: e.emergencyName ?? "",
    emergencyPhone: e.emergencyPhone ?? "",
    baseSalary: e.baseSalary === null ? "" : String(e.baseSalary),
    contractUrl: e.contractUrl ?? "",
    idCardUrl: e.idCardUrl ?? "",
    photoUrl: e.photoUrl ?? "",
    notes: e.notes ?? "",
  };
}

export function EmployeeFormDialog({ employee, open, onOpenChange }: Props) {
  const isEdit = !!employee;
  const create = useCreateEmployeeMutation();
  const update = useUpdateEmployeeMutation();
  const usersQuery = useUsersQuery({ limit: 100 });
  const [form, setForm] = useState<FormState>(emptyForm());

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setForm(employee ? fromEmployee(employee) : emptyForm());
  }

  const isPending = create.isPending || update.isPending;
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function buildPayload() {
    const trim = (s: string) => (s.trim() === "" ? undefined : s.trim());
    return {
      employeeCode: trim(form.employeeCode),
      jobTitle: trim(form.jobTitle),
      department: trim(form.department),
      employmentType: form.employmentType,
      hireDate: form.hireDate || undefined,
      nationalId: trim(form.nationalId),
      personalPhone: trim(form.personalPhone),
      personalEmail: trim(form.personalEmail),
      address: trim(form.address),
      emergencyName: trim(form.emergencyName),
      emergencyPhone: trim(form.emergencyPhone),
      baseSalary: form.baseSalary === "" ? undefined : Number(form.baseSalary),
      contractUrl: trim(form.contractUrl),
      idCardUrl: trim(form.idCardUrl),
      photoUrl: trim(form.photoUrl),
      notes: trim(form.notes),
    };
  }

  async function submit() {
    try {
      if (isEdit && employee) {
        await update.mutateAsync({ id: employee.id, input: buildPayload() });
      } else {
        if (!form.userId) return;
        await create.mutateAsync({ userId: form.userId, ...buildPayload() });
      }
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل ملف موظف" : "إنشاء ملف موظف"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `${employee?.user.name} — ${employee?.user.email}`
              : "اربط ملف بيانات وظيفية بمستخدم قائم في النظام."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>المستخدم *</Label>
              <Select value={form.userId} onValueChange={(v) => v && set("userId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر مستخدماً" />
                </SelectTrigger>
                <SelectContent>
                  {(usersQuery.data?.users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الرقم الوظيفي" value={form.employeeCode} onChange={(v) => set("employeeCode", v)} />
            <Field label="المسمى الوظيفي" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
            <Field label="القسم" value={form.department} onChange={(v) => set("department", v)} />
            <div className="space-y-1.5">
              <Label>نوع العقد</Label>
              <Select
                value={form.employmentType}
                onValueChange={(v) => v && set("employmentType", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="تاريخ التعيين" type="date" value={form.hireDate} onChange={(v) => set("hireDate", v)} />
            <Field label="الراتب الأساسي" type="number" value={form.baseSalary} onChange={(v) => set("baseSalary", v)} />
            <Field label="رقم الهوية" value={form.nationalId} onChange={(v) => set("nationalId", v)} />
            <Field label="هاتف شخصي" value={form.personalPhone} onChange={(v) => set("personalPhone", v)} />
            <Field label="بريد شخصي" value={form.personalEmail} onChange={(v) => set("personalEmail", v)} />
            <Field label="جهة اتصال للطوارئ" value={form.emergencyName} onChange={(v) => set("emergencyName", v)} />
            <Field label="هاتف الطوارئ" value={form.emergencyPhone} onChange={(v) => set("emergencyPhone", v)} />
            <Field label="العنوان" value={form.address} onChange={(v) => set("address", v)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="رابط العقد" value={form.contractUrl} onChange={(v) => set("contractUrl", v)} />
            <Field label="رابط الهوية" value={form.idCardUrl} onChange={(v) => set("idCardUrl", v)} />
            <Field label="رابط الصورة" value={form.photoUrl} onChange={(v) => set("photoUrl", v)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-notes">ملاحظات</Label>
            <Textarea id="emp-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={isPending || (!isEdit && !form.userId)}>
            {isPending && <Spinner className="text-primary-foreground" />}
            {isEdit ? "حفظ" : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
