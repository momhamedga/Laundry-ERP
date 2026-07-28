import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendPaginated } from "../../utils/response.js";
import type { ReportsService } from "./reports.service.js";
import {
  branchesReportQuerySchema,
  customersReportQuerySchema,
  employeesReportQuerySchema,
  ordersReportQuerySchema,
  paymentsReportQuerySchema,
  servicesReportQuerySchema,
} from "./reports.validator.js";

export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  /** GET /reports/orders */
  orders: RequestHandler = asyncHandler(async (req, res) => {
    const query = ordersReportQuerySchema.parse(req.query);
    const result = await this.service.ordersReport(query);
    sendPaginated(res, { summary: result.summary, orders: result.orders }, result.meta);
  });

  /** GET /reports/payments */
  payments: RequestHandler = asyncHandler(async (req, res) => {
    const query = paymentsReportQuerySchema.parse(req.query);
    const result = await this.service.paymentsReport(query);
    sendPaginated(res, { summary: result.summary, payments: result.payments }, result.meta);
  });

  /** GET /reports/customers */
  customers: RequestHandler = asyncHandler(async (req, res) => {
    const query = customersReportQuerySchema.parse(req.query);
    const result = await this.service.customersReport(query);
    sendPaginated(
      res,
      { summary: result.summary, topCustomers: result.topCustomers, customers: result.customers },
      result.meta,
    );
  });

  /** GET /reports/services */
  services: RequestHandler = asyncHandler(async (req, res) => {
    const query = servicesReportQuerySchema.parse(req.query);
    const result = await this.service.servicesReport(query);
    sendPaginated(res, { services: result.services }, result.meta);
  });

  /** GET /reports/branches */
  branches: RequestHandler = asyncHandler(async (req, res) => {
    const query = branchesReportQuerySchema.parse(req.query);
    const result = await this.service.branchesReport(query);
    sendPaginated(res, { branches: result.branches }, result.meta);
  });

  /** GET /reports/employees */
  employees: RequestHandler = asyncHandler(async (req, res) => {
    const query = employeesReportQuerySchema.parse(req.query);
    const result = await this.service.employeesReport(query);
    sendPaginated(res, { employees: result.employees }, result.meta);
  });
}
