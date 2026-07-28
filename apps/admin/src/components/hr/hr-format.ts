import type { AttendanceStatus, LeaveStatus, LeaveType, PayrollStatus } from "@/types/hr";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "حاضر",
  LATE: "متأخر",
  ABSENT: "غائب",
  ON_LEAVE: "في إجازة",
  HALF_DAY: "نصف يوم",
};
export const ATTENDANCE_STATUS_BADGE: Record<AttendanceStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PRESENT: "default",
  LATE: "outline",
  ABSENT: "destructive",
  ON_LEAVE: "secondary",
  HALF_DAY: "outline",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "سنوية",
  SICK: "مرضية",
  UNPAID: "بدون راتب",
  EMERGENCY: "طارئة",
  OTHER: "أخرى",
};
export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: "معلّقة",
  APPROVED: "معتمدة",
  REJECTED: "مرفوضة",
  CANCELLED: "ملغاة",
};
export const LEAVE_STATUS_BADGE: Record<LeaveStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمدة",
  PAID: "مدفوعة",
};
export const PAYROLL_STATUS_BADGE: Record<PayrollStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  APPROVED: "default",
  PAID: "secondary",
};

export function minutesToHhMm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}س ${m}د`;
}
