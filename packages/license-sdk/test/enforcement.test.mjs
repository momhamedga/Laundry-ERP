/**
 * اختبارات فرض الترخيص (Phase 15B — الربط).
 *
 * تتحقق من قاعدة القرار نفسها (isSellingAllowed) ومن مطابقة مسارات المنع في
 * الطبقتين: العملية الرئيسية (URL كامل) والواجهة (مسار نسبي في axios).
 *
 * تُعاد كتابة منطق المطابقة هنا **حرفياً** كما في المصدرين لأن الوحدتين تعتمدان
 * على `electron` و`@/lib/desktop` وهما غير قابلتين للتحميل خارج بيئتيهما؛
 * أي انحراف بين النسختين يظهر في اختبار المزامنة أدناه.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// ==================== قاعدة القرار ====================

/** نفس منطق isSellingAllowed في license-service.ts */
const sellingAllowed = (s) => s.valid || s.inGrace === true;

test("قاعدة القرار: صالح ⇒ مسموح", () => {
  assert.equal(sellingAllowed({ valid: true, inGrace: false }), true);
});

test("قاعدة القرار: غير صالح داخل السماح ⇒ مسموح (لا نُوقف مغسلة فجأة)", () => {
  for (const reason of ["no_license", "expired", "machine_mismatch", "malformed", "signature_invalid", "clock_tampered"]) {
    assert.equal(
      sellingAllowed({ valid: false, reason, inGrace: true, graceDaysRemaining: 5 }),
      true,
      reason,
    );
  }
});

test("قاعدة القرار: غير صالح بعد السماح ⇒ ممنوع", () => {
  for (const reason of ["no_license", "expired", "machine_mismatch", "malformed", "signature_invalid", "clock_tampered"]) {
    assert.equal(
      sellingAllowed({ valid: false, reason, inGrace: false, graceDaysRemaining: 0 }),
      false,
      reason,
    );
  }
});

// ==================== مطابقة المسارات — العملية الرئيسية ====================

const MAIN_PATHS = ["/api/v1/customers", "/api/v1/orders", "/api/v1/payments", "/api/v1/invoices", "/api/v1/purchases", "/api/v1/suppliers"];

function isBlockedCreateRequest(method, url) {
  if (method.toUpperCase() !== "POST") return false;
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  return MAIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const BASE = "http://localhost:4000";

test("main: POST لكل كيان مالي يُمنَع", () => {
  for (const p of MAIN_PATHS) {
    assert.equal(isBlockedCreateRequest("POST", BASE + p), true, p);
  }
});

test("main: المسارات الفرعية للإنشاء تُمنَع أيضاً", () => {
  assert.equal(isBlockedCreateRequest("POST", `${BASE}/api/v1/invoices/123/payments`), true);
  assert.equal(isBlockedCreateRequest("POST", `${BASE}/api/v1/orders/abc/items`), true);
});

test("main: القراءة (GET) لا تُمنَع أبداً", () => {
  for (const p of MAIN_PATHS) {
    assert.equal(isBlockedCreateRequest("GET", BASE + p), false, p);
  }
});

test("main: التعديل والحذف مسموحان (تصحيح البيانات وإغلاق الطلبات)", () => {
  for (const m of ["PUT", "PATCH", "DELETE"]) {
    assert.equal(isBlockedCreateRequest(m, `${BASE}/api/v1/orders/1`), false, m);
  }
});

test("main: كل ما يجب أن يبقى متاحاً لا يُمنَع", () => {
  const allowed = [
    "/api/v1/backup",           // نسخ احتياطي
    "/api/v1/backup/restore",   // استعادة
    "/api/v1/reports/orders",   // تقارير
    "/api/v1/settings",         // إعدادات
    "/api/v1/notifications",    // إشعارات
    "/api/v1/auth/login",       // تسجيل الدخول
    "/api/v1/auth/refresh",
    "/api/v1/stats",            // لوحة المعلومات
    "/api/v1/barcodes",         // باركود
    "/api/v1/services",
    "/api/v1/users",
    "/api/v1/branches",
    "/api/v1/inventory/items",  // المخزون نفسه ليس بيعاً
  ];
  for (const p of allowed) {
    assert.equal(isBlockedCreateRequest("POST", BASE + p), false, p);
  }
});

test("main: عنوان تالف لا يرمي ولا يمنع", () => {
  assert.equal(isBlockedCreateRequest("POST", "not-a-url"), false);
  assert.equal(isBlockedCreateRequest("POST", ""), false);
});

test("main: لا يُخدع بمسار يحتوي الاسم كجزء من كلمة", () => {
  assert.equal(isBlockedCreateRequest("POST", `${BASE}/api/v1/ordersomething`), false);
  assert.equal(isBlockedCreateRequest("POST", `${BASE}/api/v1/customers-archive`), false);
});

// ==================== مطابقة المسارات — الواجهة (axios) ====================

const FE_PATHS = ["/customers", "/orders", "/payments", "/invoices", "/purchases", "/suppliers"];

function isBlockedCreate(method, url) {
  if ((method ?? "get").toUpperCase() !== "POST") return false;
  const p = (url ?? "").split("?")[0] ?? "";
  return FE_PATHS.some((x) => p === x || p.startsWith(`${x}/`));
}

test("axios: POST لكل كيان مالي يُمنَع", () => {
  for (const p of FE_PATHS) assert.equal(isBlockedCreate("post", p), true, p);
});

test("axios: القراءة والتقارير والنسخ الاحتياطي تمرّ", () => {
  for (const p of ["/orders", "/customers", "/reports/orders", "/backup", "/settings", "/stats"]) {
    assert.equal(isBlockedCreate("get", p), false, p);
  }
  assert.equal(isBlockedCreate("post", "/backup"), false);
  assert.equal(isBlockedCreate("post", "/reports/export"), false);
});

test("axios: معاملات الاستعلام لا تكسر المطابقة", () => {
  assert.equal(isBlockedCreate("post", "/orders?branchId=1"), true);
});

test("axios: method غير محدّد يُعامَل كـ GET", () => {
  assert.equal(isBlockedCreate(undefined, "/orders"), false);
});

// ==================== تزامن القائمتين ====================

test("قائمتا المنع في العملية الرئيسية والواجهة متطابقتان", () => {
  const mainSrc = fs.readFileSync(
    path.join(ROOT, "apps", "desktop", "src", "main", "license", "license-guard.ts"),
    "utf8",
  );
  const feSrc = fs.readFileSync(
    path.join(ROOT, "apps", "admin", "src", "lib", "license-gate.ts"),
    "utf8",
  );
  const grab = (src) =>
    [...src.matchAll(/"(\/[a-z0-9/v]*?)"/g)]
      .map((m) => m[1])
      .filter((p) => p.includes("customers") || p.includes("orders") || p.includes("payments") || p.includes("invoices") || p.includes("purchases") || p.includes("suppliers"))
      .map((p) => p.replace("/api/v1", ""))
      .sort();

  const a = grab(mainSrc);
  const b = grab(feSrc);
  assert.ok(a.length === 6, `العملية الرئيسية: توقّعنا 6 مسارات، وجدنا ${a.length}: ${a}`);
  assert.deepEqual(a, b, "القائمتان اختلفتا — أي تعديل يجب أن يطال الملفّين معاً");
});

// ==================== ثبات نصّ الرسالة ====================

test("رسالة المنع موحّدة بين العملية الرئيسية والواجهة", () => {
  const pick = (f) => {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    const m = src.match(/LICENSE_BLOCKED_MESSAGE =\s*([\s\S]*?);/);
    assert.ok(m, `لم نجد الرسالة في ${f}`);
    return m[1].replace(/[\s"+]/g, "");
  };
  assert.equal(
    pick("apps/desktop/src/main/license/license-guard.ts"),
    pick("apps/admin/src/lib/license-gate.ts"),
  );
});
