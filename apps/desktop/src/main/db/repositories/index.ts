/**
 * طبقة الـ Repository المحلّية (Phase 11.6B) — نقطة تجميع واحدة.
 * الواجهة (عبر IPC) تستدعي هذه الدوال للعمل دون إنترنت؛ الكتابات تُلتقط للمزامنة.
 */
export {
  createCustomer,
  updateCustomer,
  listCustomers,
  getCustomer,
} from "./customers.repo.js";
export { createOrder, listOrders, getOrder } from "./orders.repo.js";
export { createPayment, listPayments, getPayment } from "./payments.repo.js";
export { putCache, readCache } from "./cache.repo.js";
export { listPending, listAll, pendingCount } from "./sync-queue.repo.js";
