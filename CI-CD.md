# CI / CD

خطّ التكامل المستمر مُعرَّف في [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## المشغّلات (Triggers)
| المشغّل | متى |
|---|---|
| `push` | إلى `main` و `develop` |
| `pull_request` | يستهدف `main` و `develop` |
| `workflow_dispatch` | تشغيل يدوي من واجهة GitHub |
| `schedule` | Nightly — `0 3 * * *` (03:00 UTC) — انحدار ليلي |

`concurrency` يُلغي التشغيلات المتجاوَزة على نفس الـ ref لتوفير الدقائق.

## الوظائف (Jobs)

### `api` (مصفوفة Node 20 + 22)
`checkout` → `pnpm` → `setup-node` (+ cache pnpm) → `install --frozen-lockfile`
→ **prisma generate** → **typecheck** → **test:coverage** → **build** →
رفع `api-coverage` (على Node 20).

### `admin` (مصفوفة Node 20 + 22)
`checkout` → `pnpm` → `setup-node` → `install --frozen-lockfile` →
prisma generate (أنواع مشتركة عبر `@prisma/client`) → **type-check** →
**ESLint** → **test:coverage** → **build** → رفع `admin-coverage`.

### `quality-gate`
يعتمد على `api` و `admin`؛ يفشل إن فشل أيّ منهما. هذا هو الفحص الواحد المطلوب
في حماية الفرع.

## بوّابات الجودة (Quality Gates)
الدمج ممنوع ما لم تنجح: **TypeScript + ESLint + Unit Tests + Coverage + Build**
على كلا التطبيقين وكل إصدارات Node.

### تفعيل الحماية (إعداد GitHub — مرّة واحدة)
`Settings → Branches → Branch protection rules` لـ `main` و `develop`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass → اختر **Quality Gate**
- ✅ Require branches to be up to date before merging

> حماية الفرع إعداد على مستوى المستودع في GitHub ولا يمكن أن يُقيَّد داخل الملفات؛
> الـ workflow يوفّر الفحص، والإعداد أعلاه يجعله إلزاميّاً.

## المتغيّرات البيئية في CI
`DATABASE_URL` و `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` تُعيَّن كقيم وهمية على
مستوى الـ workflow لإرضاء مُتحقّق `config/env.ts` أثناء typecheck/build/tests
(اختبارات الوحدة لا تلمس قاعدة بيانات حقيقية). **لا أسرار إنتاج في CI.**

## Artifacts
- `api-coverage` و `admin-coverage` (lcov + json-summary + نص) — احتفاظ 14 يوماً.

## توسعة مستقبلية (اختبارات التكامل في CI)
أضِف خدمة Postgres إلى وظيفة `api`:
```yaml
services:
  postgres:
    image: postgres:16
    env: { POSTGRES_PASSWORD: ci, POSTGRES_DB: laundry_ci }
    ports: ["5432:5432"]
```
ثم `prisma migrate deploy` قبل تشغيل مجموعة التكامل.
