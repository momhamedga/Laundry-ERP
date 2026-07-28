import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { EmployeesService } from "./employees.service.js";
import {
  changeEmployeeStatusSchema,
  createDocumentSchema,
  createEmployeeSchema,
  documentIdParamSchema,
  employeeIdParamSchema,
  expiringDocsQuerySchema,
  listEmployeesQuerySchema,
  updateDocumentSchema,
  updateEmployeeSchema,
} from "./employees.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listEmployeesQuerySchema.parse(req.query);
    const { employees, meta } = await this.service.list(query);
    sendPaginated(res, { employees }, meta);
  });

  stats: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { stats: await this.service.stats() });
  });

  getById: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = employeeIdParamSchema.parse(req.params);
    sendSuccess(res, { employee: await this.service.getById(id) });
  });

  create: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = createEmployeeSchema.parse(req.body);
    const employee = await this.service.create(user, getRequestContext(req), dto);
    sendCreated(res, { employee }, "تم إنشاء ملف الموظف");
  });

  update: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = employeeIdParamSchema.parse(req.params);
    const dto = updateEmployeeSchema.parse(req.body);
    const employee = await this.service.update(user, getRequestContext(req), id, dto);
    sendSuccess(res, { employee }, "تم تحديث ملف الموظف");
  });

  changeStatus: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = employeeIdParamSchema.parse(req.params);
    const dto = changeEmployeeStatusSchema.parse(req.body);
    const employee = await this.service.changeStatus(user, getRequestContext(req), id, dto);
    sendSuccess(res, { employee }, "تم تحديث حالة الموظف");
  });

  // ==================== Documents (Phase 9.6b) ====================

  expiringDocuments: RequestHandler = asyncHandler(async (req, res) => {
    const { withinDays } = expiringDocsQuerySchema.parse(req.query);
    sendSuccess(res, { documents: await this.service.expiringDocuments(withinDays) });
  });

  listDocuments: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = employeeIdParamSchema.parse(req.params);
    sendSuccess(res, { documents: await this.service.listDocuments(id) });
  });

  createDocument: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = employeeIdParamSchema.parse(req.params);
    const dto = createDocumentSchema.parse(req.body);
    const document = await this.service.createDocument(user, getRequestContext(req), id, dto);
    sendCreated(res, { document }, "تم إضافة المستند");
  });

  updateDocument: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = documentIdParamSchema.parse(req.params);
    const dto = updateDocumentSchema.parse(req.body);
    const document = await this.service.updateDocument(user, getRequestContext(req), id, dto);
    sendSuccess(res, { document }, "تم تحديث المستند");
  });

  deleteDocument: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = documentIdParamSchema.parse(req.params);
    await this.service.deleteDocument(user, getRequestContext(req), id);
    sendNoContent(res);
  });
}
