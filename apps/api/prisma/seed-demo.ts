import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/bcrypt.js";

/**
 * Demo seed — populates a demonstrable dataset so the app can be shown immediately:
 * 1 branch, 6 services, 5 staff accounts, 100 customers, 1000 orders (with items),
 * and payments (paid / partial / unpaid mix). Deterministic ids + skipDuplicates
 * make it idempotent (safe to re-run). Uses the existing schema only — no changes.
 *
 * Run against a DEMO database:  pnpm --filter @laundry/api exec tsx prisma/seed-demo.ts
 * ⚠️ Do NOT run against a production database with real data.
 */
const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo@12345";
const CUSTOMERS = 100;
const ORDERS = 1000;

const STAFF: { id: string; name: string; email: string; role: "MANAGER" | "CASHIER" | "WORKER" | "DELIVERY" }[] = [
  { id: "demo-user-mgr", name: "مدير الفرع", email: "manager@demo.local", role: "MANAGER" },
  { id: "demo-user-cash1", name: "كاشير ١", email: "cashier1@demo.local", role: "CASHIER" },
  { id: "demo-user-cash2", name: "كاشير ٢", email: "cashier2@demo.local", role: "CASHIER" },
  { id: "demo-user-worker", name: "عامل مغسلة", email: "worker@demo.local", role: "WORKER" },
  { id: "demo-user-delivery", name: "مندوب توصيل", email: "delivery@demo.local", role: "DELIVERY" },
];

const SERVICES: { id: string; name: string; price: number }[] = [
  { id: "demo-svc-1", name: "غسيل قميص", price: 15 },
  { id: "demo-svc-2", name: "كي بدلة", price: 40 },
  { id: "demo-svc-3", name: "غسيل جاف - فستان", price: 60 },
  { id: "demo-svc-4", name: "غسيل بطانية", price: 35 },
  { id: "demo-svc-5", name: "كي ثوب", price: 20 },
  { id: "demo-svc-6", name: "تنظيف سجاد (م²)", price: 12 },
];

const ORDER_STATUSES = ["RECEIVED", "WASHING", "IRONING", "READY", "DELIVERED"] as const;

async function main(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const branch = await prisma.branch.upsert({
    where: { id: "demo-branch" },
    update: {},
    create: { id: "demo-branch", name: "الفرع الرئيسي (Demo)", address: "المعادي، القاهرة", phone: "0223456789", isActive: true },
  });

  const category = await prisma.serviceCategory.upsert({
    where: { name: "خدمات المغسلة" },
    update: {},
    create: { id: "demo-cat", name: "خدمات المغسلة", sortOrder: 1, isActive: true },
  });

  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: { price: s.price },
      create: { id: s.id, name: s.name, price: s.price, categoryId: category.id, isActive: true, sortOrder: 0 },
    });
  }

  for (const u of STAFF) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { id: u.id, name: u.name, email: u.email, passwordHash, role: u.role, isActive: true },
    });
  }
  const cashierIds = ["demo-user-cash1", "demo-user-cash2"];

  // ---- customers ----
  const customers = Array.from({ length: CUSTOMERS }, (_, i) => ({
    id: `demo-cust-${String(i + 1).padStart(4, "0")}`,
    name: `عميل ${i + 1}`,
    phone: `0111${String(1000000 + i).padStart(7, "0")}`,
    email: i % 3 === 0 ? `customer${i + 1}@demo.local` : null,
    address: i % 2 === 0 ? "المعادي" : "مدينة نصر",
    isActive: true,
  }));
  await prisma.customer.createMany({ data: customers, skipDuplicates: true });

  // ---- orders + items + payments (built in memory, inserted in batches) ----
  const orders: {
    id: string; orderNumber: string; status: (typeof ORDER_STATUSES)[number];
    paymentStatus: "UNPAID" | "PARTIAL" | "PAID"; subtotal: number; discount: number; total: number;
    paidAmount: number; receivedAt: Date; dueDate: Date; customerId: string; branchId: string; createdById: string;
  }[] = [];
  const items: { id: string; quantity: number; unitPrice: number; discount: number; subtotal: number; orderId: string; serviceId: string }[] = [];
  const payments: { id: string; amount: number; method: "CASH" | "CARD"; orderId: string; receivedById: string }[] = [];

  const now = Date.now();
  for (let i = 0; i < ORDERS; i++) {
    const oid = `demo-ord-${String(i + 1).padStart(6, "0")}`;
    const itemCount = 1 + (i % 3);
    let subtotal = 0;
    for (let k = 0; k < itemCount; k++) {
      const svc = SERVICES[(i + k) % SERVICES.length]!;
      const quantity = 1 + (i % 4);
      const sub = svc.price * quantity;
      subtotal += sub;
      items.push({ id: `demo-item-${oid}-${k}`, quantity, unitPrice: svc.price, discount: 0, subtotal: sub, orderId: oid, serviceId: svc.id });
    }
    const discount = i % 5 === 0 ? 10 : 0;
    const total = Math.max(0, subtotal - discount);
    const pay = i % 4; // 0 unpaid, 1 partial, else paid
    const paidAmount = pay === 0 ? 0 : pay === 1 ? Math.round(total / 2) : total;
    const paymentStatus = paidAmount <= 0 ? "UNPAID" : paidAmount >= total ? "PAID" : "PARTIAL";
    const receivedAt = new Date(now - (i % 30) * 86_400_000);
    orders.push({
      id: oid, orderNumber: `ORD-2026-${String(i + 1).padStart(6, "0")}`,
      status: ORDER_STATUSES[i % ORDER_STATUSES.length]!, paymentStatus,
      subtotal, discount, total, paidAmount, receivedAt, dueDate: new Date(receivedAt.getTime() + 2 * 86_400_000),
      customerId: `demo-cust-${String((i % CUSTOMERS) + 1).padStart(4, "0")}`, branchId: branch.id, createdById: cashierIds[i % 2]!,
    });
    if (paidAmount > 0) {
      payments.push({ id: `demo-pay-${oid}`, amount: paidAmount, method: i % 3 === 0 ? "CARD" : "CASH", orderId: oid, receivedById: cashierIds[i % 2]! });
    }
  }

  const chunk = <T>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
  for (const c of chunk(orders, 500)) await prisma.order.createMany({ data: c, skipDuplicates: true });
  for (const c of chunk(items, 500)) await prisma.orderItem.createMany({ data: c, skipDuplicates: true });
  for (const c of chunk(payments, 500)) await prisma.payment.createMany({ data: c, skipDuplicates: true });

  console.log(`✅ Demo seed complete: ${CUSTOMERS} customers, ${orders.length} orders, ${items.length} items, ${payments.length} payments.`);
  console.log(`   Staff logins (password: ${DEMO_PASSWORD}): ${STAFF.map((s) => s.email).join(", ")}`);
}

main()
  .catch((err: unknown) => {
    console.error("❌ Demo seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
