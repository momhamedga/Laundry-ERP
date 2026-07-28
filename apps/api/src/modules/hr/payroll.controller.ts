import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { PayrollService } from "./payroll.service.js";
import {
  componentIdParamSchema,
  employeeIdParamSchema,
  generatePayrollSchema,
  listPayrollQuerySchema,
  payrollRunIdParamSchema,
  upsertSalaryComponentSchema,
} from "./payroll.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listPayrollQuerySchema.parse(req.query);
    const { runs, meta } = await this.service.list(query);
    sendPaginated(res, { runs }, meta);
  });

  getRun: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = payrollRunIdParamSchema.parse(req.params);
    const { run, payslips } = await this.service.getRun(id);
    sendSuccess(res, { run, payslips });
  });

  generate: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = generatePayrollSchema.parse(req.body);
    sendCreated(res, { run: await this.service.generate(user, getRequestContext(req), dto) }, "تم توليد الرواتب");
  });

  approve: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = payrollRunIdParamSchema.parse(req.params);
    sendSuccess(res, { run: await this.service.approve(user, getRequestContext(req), id) }, "تم اعتماد الرواتب");
  });

  components: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = employeeIdParamSchema.parse(req.params);
    sendSuccess(res, { components: await this.service.components(id) });
  });

  createComponent: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = upsertSalaryComponentSchema.parse(req.body);
    sendCreated(res, { component: await this.service.upsertComponent(user, getRequestContext(req), dto) });
  });

  updateComponent: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = componentIdParamSchema.parse(req.params);
    const dto = upsertSalaryComponentSchema.parse(req.body);
    sendSuccess(res, { component: await this.service.upsertComponent(user, getRequestContext(req), dto, id) });
  });

  deleteComponent: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = componentIdParamSchema.parse(req.params);
    await this.service.deleteComponent(user, getRequestContext(req), id);
    sendNoContent(res);
  });
}
