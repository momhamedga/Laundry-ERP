import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { ExpensesController } from "./expenses.controller.js";
import { createExpenseSchema, updateExpenseSchema } from "./expenses.validator.js";

/**
 * مسارات المصروفات - /api/v1/expenses
 *
 * الصلاحيات مفروضة هنا لا في الواجهة: إخفاء الزرّ تحسينُ تجربة، والحاجز الفعلي
 * هذا. وأسماؤها تتبع اصطلاح الوحدات الحديثة (مفرد + فعل)، والإلغاء يستخدم
 * `expense:cancel` على سابقة `orders:cancel` لا `delete` — فالسجلّ لا يُحذف.
 */
export function createExpensesRouter(controller: ExpensesController): Router {
  const router = Router();

  router.use(authenticate);

  // الملخّص قبل /:id وإلا التقطه كمُعرِّف
  router.get("/summary", requirePermission("expense:view"), controller.summary);

  router.get("/", requirePermission("expense:view"), controller.list);
  router.post(
    "/",
    requirePermission("expense:create"),
    validateBody(createExpenseSchema),
    controller.create,
  );
  router.get("/:id", requirePermission("expense:view"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("expense:update"),
    validateBody(updateExpenseSchema),
    controller.update,
  );
  router.post("/:id/cancel", requirePermission("expense:cancel"), controller.cancel);

  return router;
}
