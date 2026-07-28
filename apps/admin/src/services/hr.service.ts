import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  AttendanceCorrectionInput,
  AttendanceView,
  ClockActionInput,
  CreateDocumentInput,
  CreateLeaveInput,
  EmployeeDocumentView,
  GeneratePayrollInput,
  LeaveBalanceView,
  LeaveView,
  ListAttendanceParams,
  ListLeavesParams,
  PaginationMeta,
  PayrollRunView,
  PayslipView,
  ReviewLeaveInput,
  SalaryComponentView,
  UpsertLeaveBalanceInput,
  UpsertSalaryComponentInput,
} from "@/types/hr";

// ==================== Attendance ====================
export async function listAttendance(
  params: ListAttendanceParams,
): Promise<{ records: AttendanceView[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiListResponse<{ records: AttendanceView[] }>>(
    "/hr/attendance",
    { params },
  );
  return { records: data.data.records, meta: data.meta as PaginationMeta };
}
export async function clockIn(input: ClockActionInput): Promise<AttendanceView> {
  const { data } = await apiClient.post<ApiResponse<{ record: AttendanceView }>>("/hr/attendance/clock-in", input);
  return data.data.record;
}
export async function clockOut(employeeProfileId: string): Promise<AttendanceView> {
  const { data } = await apiClient.post<ApiResponse<{ record: AttendanceView }>>("/hr/attendance/clock-out", { employeeProfileId });
  return data.data.record;
}
export async function startBreak(employeeProfileId: string): Promise<AttendanceView> {
  const { data } = await apiClient.post<ApiResponse<{ record: AttendanceView }>>("/hr/attendance/break/start", { employeeProfileId });
  return data.data.record;
}
export async function resumeBreak(employeeProfileId: string): Promise<AttendanceView> {
  const { data } = await apiClient.post<ApiResponse<{ record: AttendanceView }>>("/hr/attendance/break/resume", { employeeProfileId });
  return data.data.record;
}
export async function correctAttendance(input: AttendanceCorrectionInput): Promise<AttendanceView> {
  const { data } = await apiClient.post<ApiResponse<{ record: AttendanceView }>>("/hr/attendance/correction", input);
  return data.data.record;
}
export async function approveAttendance(id: string): Promise<AttendanceView> {
  const { data } = await apiClient.post<ApiResponse<{ record: AttendanceView }>>(`/hr/attendance/${id}/approve`);
  return data.data.record;
}

// ==================== Leaves ====================
export async function listLeaves(
  params: ListLeavesParams,
): Promise<{ leaves: LeaveView[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiListResponse<{ leaves: LeaveView[] }>>("/hr/leaves", { params });
  return { leaves: data.data.leaves, meta: data.meta as PaginationMeta };
}
export async function createLeave(input: CreateLeaveInput): Promise<LeaveView> {
  const { data } = await apiClient.post<ApiResponse<{ leave: LeaveView }>>("/hr/leaves", input);
  return data.data.leave;
}
export async function reviewLeave(id: string, input: ReviewLeaveInput): Promise<LeaveView> {
  const { data } = await apiClient.post<ApiResponse<{ leave: LeaveView }>>(`/hr/leaves/${id}/review`, input);
  return data.data.leave;
}
export async function cancelLeave(id: string): Promise<LeaveView> {
  const { data } = await apiClient.post<ApiResponse<{ leave: LeaveView }>>(`/hr/leaves/${id}/cancel`);
  return data.data.leave;
}
export async function getLeaveBalances(employeeProfileId: string): Promise<LeaveBalanceView[]> {
  const { data } = await apiClient.get<ApiResponse<{ balances: LeaveBalanceView[] }>>(`/hr/leaves/balances/${employeeProfileId}`);
  return data.data.balances;
}
export async function setLeaveBalance(input: UpsertLeaveBalanceInput): Promise<LeaveBalanceView> {
  const { data } = await apiClient.post<ApiResponse<{ balance: LeaveBalanceView }>>("/hr/leaves/balances", input);
  return data.data.balance;
}

// ==================== Payroll ====================
export async function listPayrollRuns(
  params: { page?: number; limit?: number; status?: PayrollRunView["status"] },
): Promise<{ runs: PayrollRunView[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiListResponse<{ runs: PayrollRunView[] }>>("/hr/payroll", { params });
  return { runs: data.data.runs, meta: data.meta as PaginationMeta };
}
export async function getPayrollRun(id: string): Promise<{ run: PayrollRunView; payslips: PayslipView[] }> {
  const { data } = await apiClient.get<ApiResponse<{ run: PayrollRunView; payslips: PayslipView[] }>>(`/hr/payroll/${id}`);
  return data.data;
}
export async function generatePayroll(input: GeneratePayrollInput): Promise<PayrollRunView> {
  const { data } = await apiClient.post<ApiResponse<{ run: PayrollRunView }>>("/hr/payroll/generate", input);
  return data.data.run;
}
export async function approvePayroll(id: string): Promise<PayrollRunView> {
  const { data } = await apiClient.post<ApiResponse<{ run: PayrollRunView }>>(`/hr/payroll/${id}/approve`);
  return data.data.run;
}
export async function getSalaryComponents(employeeProfileId: string): Promise<SalaryComponentView[]> {
  const { data } = await apiClient.get<ApiResponse<{ components: SalaryComponentView[] }>>(`/hr/payroll/components/${employeeProfileId}`);
  return data.data.components;
}
export async function createSalaryComponent(input: UpsertSalaryComponentInput): Promise<SalaryComponentView> {
  const { data } = await apiClient.post<ApiResponse<{ component: SalaryComponentView }>>("/hr/payroll/components", input);
  return data.data.component;
}
export async function deleteSalaryComponent(id: string): Promise<void> {
  await apiClient.delete(`/hr/payroll/components/${id}`);
}

// ==================== Documents ====================
export async function listDocuments(employeeProfileId: string): Promise<EmployeeDocumentView[]> {
  const { data } = await apiClient.get<ApiResponse<{ documents: EmployeeDocumentView[] }>>(`/employees/${employeeProfileId}/documents`);
  return data.data.documents;
}
export async function createDocument(employeeProfileId: string, input: CreateDocumentInput): Promise<EmployeeDocumentView> {
  const { data } = await apiClient.post<ApiResponse<{ document: EmployeeDocumentView }>>(`/employees/${employeeProfileId}/documents`, input);
  return data.data.document;
}
export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/employees/documents/${id}`);
}
export async function getExpiringDocuments(withinDays: number): Promise<EmployeeDocumentView[]> {
  const { data } = await apiClient.get<ApiResponse<{ documents: EmployeeDocumentView[] }>>(`/employees/documents/expiring`, { params: { withinDays } });
  return data.data.documents;
}
