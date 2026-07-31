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

## ميزات Enterprise (Phase 11.5)
كلها main-process، تُستهلَك من الواجهة عبر `window.desktop`، بلا تغيير أي API/DTO/DB.
- **Direct Printing**: ملفّات A4/A5/58mm/80mm/label + طباعة صامتة + معاينة + اختيار طابعة
  + طباعة خام ESC/POS لطابعة شبكية (`print.receipt/raw/silent/preview/toPdf/listPrinters`).
- **Cash Drawer**: نبضة ESC/POS عبر منفذ خام (شبكة) (`cashDrawer.open`).
- **Multi-Window**: نوافذ مستقلّة POS/Reports/Customer/Print-Preview (`windows.open/close/focus`).
- **Settings**: إعدادات سطح مكتب كاملة (طابعات/كاميرا/نسخ/مزامنة/إشعارات/ثيم/لغة/بدء التشغيل…)
  (`settings.getAll/update`).
- **Auto Backup**: يومي/أسبوعي/يدوي/عند الخروج + ضغط gzip + سياسة احتفاظ + **Restore بتحقّق**
  (`backup.run/list/restore`).
- **Crash Reporter**: محلي فقط (Stack/Reason/System Info/Time)، بلا رفع خارجي (`crash.list/openDir`).
- **Keyboard Shortcuts**: F1/F2/F3/Ctrl+S/P/N/F/Ctrl+Shift+S/Esc (تبثّ إجراءات للواجهة) (`shortcuts.list` + `on.shortcut`).
- **Enhanced Tray**: لوحة التحكم/طلب جديد/قائمة الطباعة/حالة المزامنة/نسخة احتياطية/خروج.
- **Desktop Notifications** مُصنّفة (طلب جديد/دفع/مخزون/مزامنة/تحديث/نسخة).
- **File Association**: `.laundry` · `.invoice` · `.receipt`.

### قيود صريحة (لم تُختبَر عتاديّاً / مؤجّلة — بلا ادّعاء)
- الطباعة الحرارية/الملصقات/الباركود ودرج الكاش وماسح USB والكاميرا: **الكود جاهز لكن يتطلّب
  عتاداً فعليّاً للتحقّق** (تعذّر اختباره في بيئة بلا عتاد). ماسح Keyboard-wedge يعمل بالواجهة.
- **SQLite + Offline Mode + Background Sync + Camera scanning**: **مؤجّلة عمداً** — تتطلّب وحدة
  أصلية (`better-sqlite3` → electron-rebuild) وتكاملاً كبيراً مع واجهة Admin (التقاط أوفلاين +
  `getUserMedia`). شحنُها بلا اختبار سيخالف مبدأ عدم اختلاق النتائج. المعمارية موثّقة كمرحلة تالية.
