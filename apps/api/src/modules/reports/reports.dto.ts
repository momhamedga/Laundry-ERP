import type { z } from "zod";
import type {
  branchesReportQuerySchema,
  customersReportQuerySchema,
  employeesReportQuerySchema,
  ordersReportQuerySchema,
  paymentsReportQuerySchema,
  servicesReportQuerySchema,
} from "./reports.validator.js";

export type OrdersReportQuery = z.infer<typeof ordersReportQuerySchema>;
export type PaymentsReportQuery = z.infer<typeof paymentsReportQuerySchema>;
export type CustomersReportQuery = z.infer<typeof customersReportQuerySchema>;
export type ServicesReportQuery = z.infer<typeof servicesReportQuerySchema>;
export type BranchesReportQuery = z.infer<typeof branchesReportQuerySchema>;
export type EmployeesReportQuery = z.infer<typeof employeesReportQuerySchema>;
