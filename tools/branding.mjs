/**
 * قارئ هوية المنتج المشترك (Phase 15C).
 *
 * كل السكربتات (حزمة العميل، توليد الوثائق، مدير التراخيص) تقرأ من هنا، فلا
 * يتكرّر اسم شركة ولا بريد دعم في أكثر من مكان.
 *
 * القيم المؤقتة تُكتب على شكل <<...>>. `assertNoPlaceholders` يمنع بناء أي شيء
 * يُسلَّم للعميل قبل ملئها — أفضل من شحن "support@example.com" لعميل حقيقي.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONFIG_PATH = path.join(ROOT, "branding.config.json");

export function loadBranding() {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  delete raw._README;
  return raw;
}

/** يجمع مسارات كل القيم التي ما زالت مؤقتة. */
export function findPlaceholders(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      if (v.startsWith("<<") && v.endsWith(">>")) out.push({ path: p, hint: v.slice(2, -2) });
    } else if (v && typeof v === "object") {
      out.push(...findPlaceholders(v, p));
    }
  }
  return out;
}

/** يرمي إن بقيت قيم مؤقتة — يُستدعى قبل أي مخرج يُسلَّم للعميل. */
export function assertNoPlaceholders(branding = loadBranding()) {
  const missing = findPlaceholders(branding);
  if (missing.length === 0) return branding;
  const list = missing.map((m) => `  • ${m.path}  ←  ${m.hint}`).join("\n");
  throw new Error(
    `بيانات الهوية غير مكتملة — ${missing.length} قيمة ما زالت مؤقتة:\n${list}\n\n` +
      `املأها في: ${CONFIG_PATH}\n` +
      `(هذا الحاجز موجود عمداً كي لا يصل بريد أو هاتف دعم خاطئ إلى عميل حقيقي.)`,
  );
}

/**
 * يستبدل {{company.name}} وأمثالها داخل نصّ.
 *
 * السطر الذي قيمته الوحيدة فارغة يُحذف كاملاً بدل طباعة عنوان بلا قيمة
 * ("الرقم الضريبي    :") — الحقول الاختيارية التي لا يملؤها المورّد كانت تظهر
 * للعميل كأسطر خاوية في ملفّ الفاتورة.
 */
export function render(template, branding = loadBranding()) {
  const value = (key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), branding);

  return template
    .split("\n")
    .filter((line) => {
      const keys = [...line.matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => m[1]);
      if (keys.length === 0) return true;
      // يُحذف السطر إن كانت كل عناصره النائبة فارغة (ولم يحمل نصّاً آخر ذا معنى)
      const allEmpty = keys.every((k) => {
        const v = value(k);
        return v === undefined || v === null || String(v).trim() === "";
      });
      return !allEmpty;
    })
    .join("\n")
    .replace(/\{\{([\w.]+)\}\}/g, (whole, key) => {
      const v = value(key);
      return v === undefined ? whole : String(v);
    });
}
