import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BACKUP_TABLES,
  EXCLUDED_MODELS,
} from "../../src/modules/backup/backup.tables.js";

/**
 * حارس تغطية النسخة الاحتياطية.
 *
 * العطل الذي يمنعه: كانت النسخة تصدّر 10 نماذج من 48. لم يكن قراراً بل تراكم
 * إهمال عبر المراحل — تُضاف نماذج (فواتير، مخزون، مشتريات، ولاء، موارد بشرية،
 * إغلاق يوم) ولا يتذكّر أحد وحدة النسخ الاحتياطي، فتبدو النسخة ناجحة بينما
 * تفقدك عند الاستعادة معظم بيانات العمل. عطلٌ لا يظهر إلا يوم الكارثة.
 *
 * هذا الاختبار يقرأ المخطّط نفسه لا قائمة مكتوبة يدوياً، فأي نموذج جديد يُوقف
 * CI حتى يُصنَّف صراحةً: مُدرَجاً في النسخة أو مستثنى بسبب مكتوب.
 */
const SCHEMA_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prisma/schema.prisma",
);

function modelsInSchema(): string[] {
  const src = readFileSync(SCHEMA_PATH, "utf-8");
  return [...src.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1] ?? "").sort();
}

/** تبعيّات كل نموذج (الجانب المالك للعلاقة فقط) — للتحقّق من ترتيب الإدراج */
function dependencies(): Map<string, Set<string>> {
  const src = readFileSync(SCHEMA_PATH, "utf-8");
  const known = new Set(modelsInSchema());
  const deps = new Map<string, Set<string>>();

  for (const m of src.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const name = m[1] ?? "";
    const body = m[2] ?? "";
    const set = new Set<string>();
    for (const line of body.split("\n")) {
      const rel = line.match(/@relation\(([^)]*)\)/);
      if (!rel || !/fields:\s*\[/.test(rel[1] ?? "")) continue;
      const target = line.trim().match(/^\w+\s+(\w+)/)?.[1];
      if (target && known.has(target) && target !== name) set.add(target);
    }
    deps.set(name, set);
  }
  return deps;
}

describe("تغطية النسخة الاحتياطية", () => {
  it("كل نموذج في المخطّط إمّا مشمول أو مستثنى بسبب مكتوب", () => {
    const included = new Set(BACKUP_TABLES.map((t) => t.model));
    const excluded = new Set(Object.keys(EXCLUDED_MODELS));

    const unclassified = modelsInSchema().filter(
      (m) => !included.has(m) && !excluded.has(m),
    );

    expect(
      unclassified,
      `نماذج غير مصنَّفة في backup.tables.ts: ${unclassified.join(", ")}. ` +
        "أضِفها إلى BACKUP_TABLES بموضعها الصحيح في ترتيب المفاتيح الأجنبية، " +
        "أو إلى EXCLUDED_MODELS مع سبب الاستثناء.",
    ).toEqual([]);
  });

  it("لا نموذج مشمول ومستثنى في آن واحد", () => {
    const excluded = new Set(Object.keys(EXCLUDED_MODELS));
    const both = BACKUP_TABLES.filter((t) => excluded.has(t.model)).map((t) => t.model);
    expect(both).toEqual([]);
  });

  it("لكل استثناء سببٌ مكتوب لا نصّ فارغ", () => {
    for (const [model, reason] of Object.entries(EXCLUDED_MODELS)) {
      expect(reason.trim().length, `الاستثناء ${model} بلا سبب`).toBeGreaterThan(20);
    }
  });

  it("الترتيب آمن للمفاتيح الأجنبية: كل أب يسبق أبناءه", () => {
    const deps = dependencies();
    const position = new Map(BACKUP_TABLES.map((t, i) => [t.model, i]));
    const violations: string[] = [];

    for (const table of BACKUP_TABLES) {
      const childAt = position.get(table.model);
      if (childAt === undefined) continue;
      for (const parent of deps.get(table.model) ?? []) {
        const parentAt = position.get(parent);
        if (parentAt === undefined) continue; // أب مستثنى — لا قيد ترتيب عليه
        if (parentAt > childAt) violations.push(`${table.model} يسبق أباه ${parent}`);
      }
    }

    expect(
      violations,
      `ترتيب الإدراج يخالف المفاتيح الأجنبية:\n  ${violations.join("\n  ")}`,
    ).toEqual([]);
  });

  it("لا تكرار في المفاتيح ولا في أسماء النماذج", () => {
    const keys = BACKUP_TABLES.map((t) => t.key);
    const models = BACKUP_TABLES.map((t) => t.model);
    expect(new Set(keys).size, "مفاتيح مكرّرة داخل ملف النسخة").toBe(keys.length);
    expect(new Set(models).size, "نماذج مكرّرة").toBe(models.length);
  });

  it("الجداول الأساسية للعمل مشمولة صراحةً", () => {
    // قائمة يدوية مقصودة: لو أزالها أحد يوماً، يسقط الاختبار بوضوح
    const mustHave = [
      "Invoice",
      "InvoiceItem",
      "InventoryItem",
      "InventoryTransaction",
      "Supplier",
      "Purchase",
      "PurchaseItem",
      "DayClosing",
      "EmployeeProfile",
      "PayrollRun",
      "Payslip",
      "AttendanceRecord",
      "LoyaltyAccount",
      "Coupon",
    ];
    const included = new Set(BACKUP_TABLES.map((t) => t.model));
    const missing = mustHave.filter((m) => !included.has(m));
    expect(missing, `جداول عمل أساسية غائبة عن النسخة: ${missing.join(", ")}`).toEqual([]);
  });
});
