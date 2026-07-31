# Contributing

## المتطلّبات
- Node.js **≥ 20** (CI يختبر على 20 و 22)
- pnpm **11+** (`corepack enable` أو ثبّت `pnpm@11`)
- Postgres (Neon أو محلّي) للتطوير مع قاعدة بيانات

## الإعداد

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # ثم املأ DATABASE_URL و JWT secrets
pnpm --filter @laundry/api exec prisma generate
pnpm --filter @laundry/api exec prisma migrate deploy
pnpm api:dev      # الـ API على :4000
pnpm admin:dev    # الواجهة على :3000
```

> **لا تُودِع أسراراً أبداً.** ملفات `.env` مُستثناة عبر `.gitignore`؛ القالب الوحيد
> المُودَع هو `apps/api/.env.example`.

## بنية المستودع (Monorepo)
```
apps/api      Express 5 + Prisma 6 + Neon Postgres (REST API)
apps/admin    Next.js 16 + React 19 + TanStack Query (لوحة الإدارة)
apps/desktop  Electron 33 + better-sqlite3 (SQLCipher) — تطبيق سطح المكتب Offline-first
docs/         التوثيق
```
كل وحدة API تتبع: `Repository → Service → Controller → Router` مع Composition Root
في `index.ts`. لا تكسر هذا النمط. على سطح المكتب: `main/` (العمليات) + `preload/`
(جسر contextBridge الوحيد) + `shared/ipc.ts` (عقد القنوات). كل كتابة أوفلاين تُلتقط
في `sync_queue` ولا تغيّر أي عقد سيرفر.

## فروع العمل
- `main` — إنتاجي، محميّ (لا دفع مباشر).
- `develop` — تكامل.
- `feat/*`, `fix/*`, `chore/*`, `test/*`, `ci/*` — فروع عمل تُدمَج عبر PR.

## رسائل الـ Commit (Conventional Commits)
```
<type>(<scope>): <subject>
```
أنواع: `feat`, `fix`, `chore`, `test`, `ci`, `docs`, `refactor`, `perf`.
مثال: `test(api): add payroll computation tests`.

## قبل فتح PR (البوّابات محليّاً)

```bash
# API
pnpm --filter @laundry/api typecheck
pnpm --filter @laundry/api test
pnpm --filter @laundry/api build

# Admin
pnpm --filter @laundry/admin type-check
pnpm --filter @laundry/admin lint
pnpm --filter @laundry/admin test
pnpm --filter @laundry/admin build

# Desktop
pnpm --filter @laundry/desktop exec tsc --noEmit -p tsconfig.json
pnpm --filter @laundry/desktop exec eslint "src/**/*.ts"
pnpm --filter @laundry/desktop build
```
كلها يجب أن تكون خضراء — نفس ما تُشغّله CI.

## قواعد ثابتة (عقود لا تُكسَر)
- لا تغيّر أي **API/Response/DTO/Route/Permission** دون توثيق وموافقة.
- أي صلاحية جديدة بالـ Backend يجب أن تُضاف يدويّاً في مرآة الواجهة
  `apps/admin/src/constants/permissions.ts` (لا مزامنة تلقائية).
- تغييرات الـ Schema عبر Migration فقط (لا `db push` على الإنتاج).
- أضِف اختباراً لأي منطق أعمال جديد.
