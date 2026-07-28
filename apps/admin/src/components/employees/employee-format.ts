import type { ContractType, EmploymentStatus } from "@/types/employee";

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
  TERMINATED: "منتهي الخدمة",
  ARCHIVED: "مؤرشف",
};

export const EMPLOYMENT_STATUS_BADGE: Record<
  EmploymentStatus,
  "default" | "outline" | "destructive" | "secondary"
> = {
  ACTIVE: "default",
  SUSPENDED: "outline",
  TERMINATED: "destructive",
  ARCHIVED: "secondary",
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  FULL_TIME: "دوام كامل",
  PART_TIME: "دوام جزئي",
  CONTRACT: "عقد",
  TEMPORARY: "مؤقت",
};
