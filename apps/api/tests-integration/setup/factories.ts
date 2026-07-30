import type { Express } from "express";
import { prisma } from "./db.js";
import { api, bearer } from "./harness.js";

/**
 * مصانع بيانات لطبقة التكامل. تنشئ الكيانات عبر HTTP الحقيقي (بصلاحيات فعلية)
 * فتُغطّي مسارات الإنشاء ذاتها، عدا الفرع الذي يُزرع مباشرةً (Branch أساس مشترك).
 */

let seq = 0;
export const uniq = (): string => `${Date.now().toString(36)}${(seq++).toString(36)}`;
export const uniquePhone = (): string =>
  "01" + String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");

export async function seedBranch(name = "Main Branch") {
  return prisma.branch.create({ data: { name, isActive: true } });
}

function ok(res: { status: number; body: unknown }, label: string, expected = 201) {
  if (res.status !== expected) {
    throw new Error(`${label} expected ${expected}, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

export async function createCategory(
  app: Express,
  token: string,
  over: { name?: string; sortOrder?: number } = {},
) {
  const res = await api(app)
    .post("/api/v1/service-categories")
    .set(bearer(token))
    .send({ name: over.name ?? `Cat-${uniq()}`, sortOrder: over.sortOrder ?? 0 });
  ok(res, "createCategory");
  return res.body.data.category;
}

export async function createService(
  app: Express,
  token: string,
  over: { name?: string; categoryId?: string; price?: number; unit?: string } = {},
) {
  const categoryId = over.categoryId ?? (await createCategory(app, token)).id;
  const res = await api(app)
    .post("/api/v1/services")
    .set(bearer(token))
    .send({
      name: over.name ?? `Svc-${uniq()}`,
      categoryId,
      price: over.price ?? 25,
      unit: over.unit ?? "PIECE",
    });
  ok(res, "createService");
  return res.body.data.service;
}

export async function createCustomer(
  app: Express,
  token: string,
  over: { name?: string; phone?: string } = {},
) {
  const res = await api(app)
    .post("/api/v1/customers")
    .set(bearer(token))
    .send({ name: over.name ?? `Cust-${uniq()}`, phone: over.phone ?? uniquePhone() });
  ok(res, "createCustomer");
  return res.body.data.customer;
}

export interface OrderItemInput {
  serviceId: string;
  quantity: number;
  discount?: number;
}

export async function createOrder(
  app: Express,
  token: string,
  opts: { customerId: string; branchId: string; items: OrderItemInput[]; discount?: number },
) {
  const now = Date.now();
  const res = await api(app)
    .post("/api/v1/orders")
    .set(bearer(token))
    .send({
      customerId: opts.customerId,
      branchId: opts.branchId,
      items: opts.items,
      discount: opts.discount ?? 0,
      receivedAt: new Date(now).toISOString(),
      dueDate: new Date(now + 86_400_000).toISOString(),
    });
  ok(res, "createOrder");
  return res.body.data.order;
}
