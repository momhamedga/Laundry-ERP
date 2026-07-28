import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// تنظيف DOM بعد كل اختبار (عزل الحالات)
afterEach(() => {
  cleanup();
});
