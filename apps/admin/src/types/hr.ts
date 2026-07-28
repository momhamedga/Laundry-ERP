export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY";
export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "EMERGENCY" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";
export type SalaryComponentType = "ALLOWANCE" | "DEDUCTION" | "BONUS";

export interface PaginationMeta {
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

export interface EmployeeDocumentView {
  id: string;
  employeeProfileId: string;
  type: "CONTRACT" | "ID_CARD" | "PASSPORT" | "CERTIFICATE" | "OTHER";
  name: string;
  number: string | null;
  url: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  expiringSoon: boolean;
  expired: boolean;
  employeeName?: string;
  note: string | null;
  createdAt: string;
}

// ---- Inputs ----
export interface ClockActionInput {
  employeeProfileId: string;
  location?: string;
  device?: string;
}
export interface AttendanceCorrectionInput {
  employeeProfileId: string;
  workDate: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  status?: AttendanceStatus;
  breakMinutes?: number;
  note?: string;
}
export interface ListAttendanceParams {
  page?: number;
  limit?: number;
  employeeProfileId?: string;
  status?: AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
}
export interface CreateLeaveInput {
  employeeProfileId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}
export interface ReviewLeaveInput {
  status: "APPROVED" | "REJECTED";
  reviewNote?: string;
}
export interface UpsertLeaveBalanceInput {
  employeeProfileId: string;
  type: LeaveType;
  year: number;
  entitledDays: number;
}
export interface ListLeavesParams {
  page?: number;
  limit?: number;
  employeeProfileId?: string;
  status?: LeaveStatus;
  type?: LeaveType;
}
export interface GeneratePayrollInput {
  periodStart: string;
  periodEnd: string;
  label?: string;
}
export interface UpsertSalaryComponentInput {
  employeeProfileId: string;
  type: SalaryComponentType;
  label: string;
  amount: number;
  isActive?: boolean;
}
export interface CreateDocumentInput {
  type: EmployeeDocumentView["type"];
  name: string;
  number?: string;
  url?: string;
  issueDate?: string;
  expiryDate?: string;
  note?: string;
}
