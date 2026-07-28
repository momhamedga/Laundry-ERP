"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { employeeKeys } from "@/lib/query-keys";
import * as service from "@/services/employees.service";
import type {
  ChangeEmployeeStatusInput,
  CreateEmployeeInput,
  ListEmployeesParams,
  UpdateEmployeeInput,
} from "@/types/employee";

export function useEmployeesQuery(params: ListEmployeesParams) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => service.listEmployees(params),
  });
}

export function useEmployeeStatsQuery() {
  return useQuery({ queryKey: employeeKeys.stats(), queryFn: () => service.getStats() });
}

function useInvalidateEmployees() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: employeeKeys.all });
}

export function useCreateEmployeeMutation() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => service.createEmployee(input),
    onSuccess: () => {
      toast.success("تم إنشاء ملف الموظف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateEmployeeMutation() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      service.updateEmployee(id, input),
    onSuccess: () => {
      toast.success("تم تحديث ملف الموظف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useChangeEmployeeStatusMutation() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChangeEmployeeStatusInput }) =>
      service.changeEmployeeStatus(id, input),
    onSuccess: () => {
      toast.success("تم تحديث حالة الموظف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
