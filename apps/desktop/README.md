# Laundry ERP — Desktop (Electron)

قشرة سطح مكتب Enterprise تشغّل **نفس** واجهة Next.js (Admin) و**نفس** الـ API محليّاً،
بأمان Electron حديث (Context Isolation + Sandbox + Preload فقط + IPC مُصرّح ومُحقَّق).
لا إعادة كتابة للواجهة ولا تغيير في الـ API.

## المعمارية
- **Main** (`src/main`): دورة حياة التطبيق، النوافذ، الخدمات (backend/renderer/tray/menu/printing/network/updater)، التصليب الأمني.
- **Preload** (`src/preload`): جسر `window.desktop` الوحيد، مُجمَّع بـ esbuild (متوافق مع sandbox).
- **Shared** (`src/shared/ipc.ts`): عقد القنوات والأنواع (whitelist).

## التطوير
```bash
# 1) شغّل الـ API وواجهة الـ Admin كالمعتاد
pnpm --filter @laundry/api dev
pnpm --filter @laundry/admin dev      # http://localhost:3000

# 2) شغّل قشرة Electron (تعيد استخدام الخادمين القائمين)
pnpm --filter @laundry/desktop dev
```

## بناء + تغليف الإنتاج
الإنتاج يشغّل الـ API المبني وواجهة Next standalone كعمليتَي Node مدمجتين داخل
Electron. قبل التغليف تُجمَّع مخرجاتهما في `resources/`:

```bash
# 1) ابنِ الـ API والواجهة
pnpm --filter @laundry/api build
pnpm --filter @laundry/admin build     # ينتج .next/standalone (output: standalone)

# 2) جهّز resources/ (نسخ مخرجات البناء)
#    resources/api       ← apps/api/dist + node_modules + package.json + prisma
#    resources/renderer  ← apps/admin/.next/standalone (+ .next/static + public)
node apps/desktop/scripts/prepare-resources.mjs   # (اختياري - انظر أدناه)

# 3) غلّف
pnpm --filter @laundry/desktop package:win    # NSIS + Portable (Windows)
pnpm --filter @laundry/desktop package:linux  # AppImage (Linux)
# macOS DMG: يُبنى على جهاز macOS فقط (electron-builder لا يبني DMG على غير macOS)
```

## الأيقونات
ضع أيقونات التطبيق في `apps/desktop/build/`:
- `icon.ico` (Windows) · `icon.png` 512×512 (Linux/Tray) · `icon.icns` (macOS)
غيابها لا يمنع البناء (تُستخدم أيقونة Electron الافتراضية) لكنه مطلوب للإصدار النهائي.

## التحديث التلقائي
البنية جاهزة (`electron-updater` + GitHub Releases) لكنها **معطّلة** في v1.0.0.
التفعيل: اضبط `DESKTOP_ENABLE_UPDATER=1` وأزِل تعليق `publish` في `electron-builder.yml`.

## الأمان
Context Isolation ✅ · Sandbox ✅ · nodeIntegration=false ✅ · Preload فقط ✅ ·
IPC whitelist + validation ✅ · منع navigation/new-window ✅ · لا webview ✅ ·
لا remote module ✅ · فتح الروابط الخارجية بأمان عبر المتصفح الافتراضي ✅.
