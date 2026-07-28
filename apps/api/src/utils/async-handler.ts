import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * يلف الـ handlers غير المتزامنة ويمرر أي خطأ للمعالج المركزي
 * (Express 5 يدعم ذلك تلقائياً - هذا الغلاف يضمن السلوك صراحةً وثبات الأنواع)
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next): void => {
    fn(req, res, next).catch(next);
  };
}
