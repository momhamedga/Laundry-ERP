"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportKeys } from "@/lib/query-keys";
import * as reportsService from "@/services/reports.service";
import type {
  BranchesReportParams,
  CustomersReportParams,
  EmployeesReportParams,
  OrdersReportParams,
  PaymentsReportParams,
  ServicesReportParams,
} from "@/types/report";

/** Queries فقط - Reports API قراءة بحتة، بلا Mutations إطلاقاً */

export function useOrdersReportQuery(params: OrdersReportParams) {
  return useQuery({
    queryKey: reportKeys.orders(params),
    queryFn: () => reportsService.getOrdersReport(params),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentsReportQuery(params: PaymentsReportParams) {
  return useQuery({
    queryKey: reportKeys.payments(params),
    queryFn: () => reportsService.getPaymentsReport(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomersReportQuery(params: CustomersReportParams) {
  return useQuery({
    queryKey: reportKeys.customers(params),
    queryFn: () => reportsService.getCustomersReport(params),
    placeholderData: keepPreviousData,
  });
}

export function useServicesReportQuery(params: ServicesReportParams) {
  return useQuery({
    queryKey: reportKeys.services(params),
    queryFn: () => reportsService.getServicesReport(params),
    placeholderData: keepPreviousData,
  });
}

export function useBranchesReportQuery(params: BranchesReportParams) {
  return useQuery({
    queryKey: reportKeys.branches(params),
    queryFn: () => reportsService.getBranchesReport(params),
    placeholderData: keepPreviousData,
  });
}

export function useEmployeesReportQuery(params: EmployeesReportParams) {
  return useQuery({
    queryKey: reportKeys.employees(params),
    queryFn: () => reportsService.getEmployeesReport(params),
    placeholderData: keepPreviousData,
  });
}
