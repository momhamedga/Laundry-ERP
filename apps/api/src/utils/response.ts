import type { Response } from "express";

/** غلاف موحد لكل استجابات الـ API */
export interface ApiResponseBody<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  const body: ApiResponseBody<T> = { success: true, data };
  if (message !== undefined) body.message = message;
  if (meta !== undefined) body.meta = meta;
  res.status(statusCode).json(body);
}

/** استجابة قوائم مع بيانات الترقيم في meta */
export function sendPaginated<T>(
  res: Response,
  data: T,
  meta: Record<string, unknown>,
  message?: string,
): void {
  sendSuccess(res, data, message, 200, meta);
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
