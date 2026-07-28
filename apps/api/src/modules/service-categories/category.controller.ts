import type { Request, RequestHandler } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from "../../utils/response.js";
import type {
  CategoryStatusDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "./category.dto.js";
import type { CategoryService } from "./category.service.js";
import {
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from "./category.validator.js";

/** التحقق من :id في المسار (cuid) */
function parseCategoryId(req: Request): string {
  return categoryIdParamSchema.parse(req.params).id;
}

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  /** GET /service-categories - قائمة مع ترقيم/بحث/ترتيب */
  list: RequestHandler = asyncHandler(async (req, res) => {
    // query تُتحقق هنا (Express 5 يمنع إعادة تعيين req.query في middleware)
    const query = listCategoriesQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { categories: result.categories }, result.meta);
  });

  /** POST /service-categories */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const category = await this.service.create(req.body as CreateCategoryDto);
    sendCreated(res, { category }, "Category created successfully");
  });

  /** GET /service-categories/:id - مع عدد الخدمات */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const category = await this.service.getById(parseCategoryId(req));
    sendSuccess(res, { category });
  });

  /** PATCH /service-categories/:id */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const category = await this.service.update(
      parseCategoryId(req),
      req.body as UpdateCategoryDto,
    );
    sendSuccess(res, { category }, "Category updated successfully");
  });

  /** PATCH /service-categories/:id/status - Enable / Disable */
  changeStatus: RequestHandler = asyncHandler(async (req, res) => {
    const { isActive } = req.body as CategoryStatusDto;
    const category = await this.service.changeStatus(parseCategoryId(req), isActive);
    sendSuccess(res, { category }, `Category ${isActive ? "enabled" : "disabled"}`);
  });

  /** DELETE /service-categories/:id - يُرفض إذا كان يحتوي خدمات */
  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.delete(parseCategoryId(req));
    sendNoContent(res);
  });
}
