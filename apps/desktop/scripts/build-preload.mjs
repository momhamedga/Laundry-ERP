import { build } from "esbuild";

/**
 * يُجمّع الـ preload في ملف CJS واحد مكتفٍ ذاتياً (electron خارجي فقط).
 * ضروري مع sandbox=true: الـ preload المُعزول لا يستطيع require وحدات محلية
 * متفرّقة، فالحزمة الواحدة تضمن التوافق. الأنواع تُمحى، والثوابت تُدمَج.
 */
await build({
  entryPoints: ["src/preload/index.ts"],
  outfile: "dist/preload/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  external: ["electron"],
  logLevel: "info",
});

console.log("✓ preload bundled → dist/preload/index.js");
