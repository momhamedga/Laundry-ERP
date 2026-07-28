import type {
  AttendanceStatus,
  EmployeeDocumentType,
  LeaveStatus,
  LeaveType,
  PayrollStatus,
  SalaryComponentType,
} from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AttendanceView {
  id: string;
  employeeProfileId: string;
  employeeName: string;
  workDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  onBreak: boolean;
  breakMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  location: string | null;
  device: string | null;
  ipAddress: string | null;
  isManual: boolean;
  approvedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface LeaveView {
  id: string;
  employeeProfileId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface LeaveBalanceView {
  id: string;
  employeeProfileId: string;
  type: LeaveType;
  year: number;
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface EmployeeDocumentView {
  id: string;
  employeeProfileId: string;
  type: EmployeeDocumentType;
  name: string;
  number: string | null;
  url: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  expiringSoon: boolean;
  expired: boolean;
  note: string | null;
  createdAt: string;
}

export interface SalaryComponentView {
  id: string;
  employeeProfileId: string;
  type: SalaryComponentType;
  label: string;
  amount: number;
  isActive: boolean;
}

export interface PayslipView {
  id: string;
  payrollRunId: string;
  employeeProfileId: string;
  employeeName: string;
  baseSalary: number;
  allowances: number;
  bonuses: number;
  overtimePay: number;
  deductions: number;
  netSalary: number;
  workedDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  note: string | null;
}

export interface PayrollRunView {
  id: string;
  periodStart: string;
  periodEnd: string;
  label: string;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  approvedAt: string | null;
  notes: string | null;
  payslipCount: number;
  createdAt: string;
}
