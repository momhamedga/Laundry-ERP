"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { hrKeys } from "@/lib/query-keys";
import * as service from "@/services/hr.service";
import type {
  AttendanceCorrectionInput,
  ClockActionInput,
  CreateDocumentInput,
  CreateLeaveInput,
  GeneratePayrollInput,
  ListAttendanceParams,
  ListLeavesParams,
  ReviewLeaveInput,
  UpsertLeaveBalanceInput,
  UpsertSalaryComponentInput,
} from "@/types/hr";

function useInvalidateHr() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: hrKeys.all });
}
function mutationHandlers(invalidate: () => void, msg: string) {
  return {
    onSuccess: () => {
      toast.success(msg);
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  };
}

// ---- Attendance ----
export function useAttendanceQuery(params: ListAttendanceParams) {
  return useQuery({ queryKey: hrKeys.attendance(params), queryFn: () => service.listAttendance(params) });
}
export function useClockInMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (i: ClockActionInput) => service.clockIn(i), ...mutationHandlers(inv, "تم تسجيل الحضور") });
}
export function useClockOutMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (id: string) => service.clockOut(id), ...mutationHandlers(inv, "تم تسجيل الانصراف") });
}
export function useBreakMutation() {
  const inv = useInvalidateHr();
  return useMutation({
    mutationFn: ({ employeeProfileId, action }: { employeeProfileId: string; action: "start" | "resume" }) =>
      action === "start" ? service.startBreak(employeeProfileId) : service.resumeBreak(employeeProfileId),
    ...mutationHandlers(inv, "تم تحديث الاستراحة"),
  });
}
export function useCorrectAttendanceMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (i: AttendanceCorrectionInput) => service.correctAttendance(i), ...mutationHandlers(inv, "تم حفظ التصحيح") });
}
export function useApproveAttendanceMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (id: string) => service.approveAttendance(id), ...mutationHandlers(inv, "تم الاعتماد") });
}

// ---- Leaves ----
export function useLeavesQuery(params: ListLeavesParams) {
  return useQuery({ queryKey: hrKeys.leaves(params), queryFn: () => service.listLeaves(params) });
}
export function useLeaveBalancesQuery(employeeProfileId: string | null) {
  return useQuery({
    queryKey: hrKeys.leaveBalances(employeeProfileId ?? ""),
    queryFn: () => service.getLeaveBalances(employeeProfileId as string),
    enabled: !!employeeProfileId,
  });
}
export function useCreateLeaveMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (i: CreateLeaveInput) => service.createLeave(i), ...mutationHandlers(inv, "تم تقديم الطلب") });
}
export function useReviewLeaveMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: ReviewLeaveInput }) => service.reviewLeave(id, input), ...mutationHandlers(inv, "تمت المراجعة") });
}
export function useCancelLeaveMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (id: string) => service.cancelLeave(id), ...mutationHandlers(inv, "تم الإلغاء") });
}
export function useSetLeaveBalanceMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (i: UpsertLeaveBalanceInput) => service.setLeaveBalance(i), ...mutationHandlers(inv, "تم حفظ الرصيد") });
}

// ---- Payroll ----
export function usePayrollRunsQuery(params: { page?: number; limit?: number }) {
  return useQuery({ queryKey: hrKeys.payrollRuns(params), queryFn: () => service.listPayrollRuns(params) });
}
export function usePayrollRunQuery(id: string | null) {
  return useQuery({
    queryKey: hrKeys.payrollRun(id ?? ""),
    queryFn: () => service.getPayrollRun(id as string),
    enabled: !!id,
  });
}
export function useGeneratePayrollMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (i: GeneratePayrollInput) => service.generatePayroll(i), ...mutationHandlers(inv, "تم توليد الرواتب") });
}
export function useApprovePayrollMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (id: string) => service.approvePayroll(id), ...mutationHandlers(inv, "تم اعتماد الرواتب") });
}
export function useSalaryComponentsQuery(employeeProfileId: string | null) {
  return useQuery({
    queryKey: hrKeys.salaryComponents(employeeProfileId ?? ""),
    queryFn: () => service.getSalaryComponents(employeeProfileId as string),
    enabled: !!employeeProfileId,
  });
}
export function useCreateSalaryComponentMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (i: UpsertSalaryComponentInput) => service.createSalaryComponent(i), ...mutationHandlers(inv, "تمت الإضافة") });
}
export function useDeleteSalaryComponentMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (id: string) => service.deleteSalaryComponent(id), ...mutationHandlers(inv, "تم الحذف") });
}

// ---- Documents ----
export function useDocumentsQuery(employeeProfileId: string | null) {
  return useQuery({
    queryKey: hrKeys.documents(employeeProfileId ?? ""),
    queryFn: () => service.listDocuments(employeeProfileId as string),
    enabled: !!employeeProfileId,
  });
}
export function useExpiringDocumentsQuery(withinDays: number) {
  return useQuery({ queryKey: hrKeys.expiringDocuments(withinDays), queryFn: () => service.getExpiringDocuments(withinDays) });
}
export function useCreateDocumentMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: ({ employeeProfileId, input }: { employeeProfileId: string; input: CreateDocumentInput }) => service.createDocument(employeeProfileId, input), ...mutationHandlers(inv, "تمت إضافة المستند") });
}
export function useDeleteDocumentMutation() {
  const inv = useInvalidateHr();
  return useMutation({ mutationFn: (id: string) => service.deleteDocument(id), ...mutationHandlers(inv, "تم حذف المستند") });
}
