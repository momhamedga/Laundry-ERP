import type { Request, RequestHandler } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from "../../utils/response.js";
import type {
  CreateServiceDto,
  ServiceStatusDto,
  UpdateServiceDto,
} from "./services.dto.js";
import type { ServicesService } from "./services.service.js";
import {
  listServicesQuerySchema,
  serviceIdParamSchema,
} from "./services.validator.js";

/** التحقق من :id في المسار (cuid) */
function parseServiceId(req: Request): string {
  return serviceIdParamSchema.parse(req.params).id;
}

export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  /** GET /services - قائمة مع ترقيم/بحث/فلاتر/ترتيب */
  list: RequestHandler = asyncHandler(async (req, res) => {
    // query تُتحقق هنا (Express 5 يمنع إعادة تعيين req.query في middleware)
    const query = listServicesQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { services: result.services }, result.meta);
  });

  /** POST /services */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const service = await this.service.create(req.body as CreateServiceDto);
    sendCreated(res, { service }, "Service created successfully");
  });

  /** GET /services/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const service = await this.service.getById(parseServiceId(req));
    sendSuccess(res, { service });
  });

  /** PATCH /services/:id */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const service = await this.service.update(
      parseServiceId(req),
      req.body as UpdateServiceDto,
    );
    sendSuccess(res, { service }, "Service updated successfully");
  });

  /** PATCH /services/:id/status - Active / Inactive */
  changeStatus: RequestHandler = asyncHandler(async (req, res) => {
    const { isActive } = req.body as ServiceStatusDto;
    const service = await this.service.changeStatus(parseServiceId(req), isActive);
    sendSuccess(res, { service }, `Service ${isActive ? "activated" : "deactivated"}`);
  });

  /** DELETE /services/:id - Soft Delete */
  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.softDelete(parseServiceId(req));
    sendNoContent(res);
  });

  /** PATCH /services/:id/restore */
  restore: RequestHandler = asyncHandler(async (req, res) => {
    const service = await this.service.restore(parseServiceId(req));
    sendSuccess(res, { service }, "Service restored successfully");
  });

  /** POST /services/:id/image - Structure فقط (Cloudinary لاحقاً) */
  uploadImage: RequestHandler = asyncHandler(async (_req, _res) => {
    this.service.uploadImage();
  });
}
