import { beforeAll } from "vitest";
import { warmup } from "./db.js";

/**
 * قبل أي سويت تكامل: أيقظ حوسبة Neon (serverless) بإعادة محاولة، فلا يفشل أول
 * اختبار ببرود البدء. يُطبَّق لكل ملف عبر setupFiles.
 */
beforeAll(async () => {
  await warmup();
}, 60_000);
