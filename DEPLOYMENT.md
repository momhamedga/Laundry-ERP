# Deployment

دليل نشر Laundry ERP للإنتاج. تطبيقان: `apps/api` (Express/Prisma) و
`apps/admin` (Next.js).

## المتطلّبات
- Node.js ≥ 20، pnpm 11+
- Postgres 14+ (Neon موصى به)
- (اختياري) مفتاح Resend للبريد، وتخزين S3-compatible للنسخ الاحتياطي السحابي

## 1) متغيّرات البيئة

### API (`apps/api/.env`) — المصدر: `src/config/env.ts`
| المتغيّر | إلزامي | ملاحظة |
|---|---|---|
| `NODE_ENV` | — | `production` في الإنتاج |
| `PORT` | — | افتراضي 4000 |
| `DATABASE_URL` | ✅ | سلسلة اتصال Postgres |
| `CORS_ORIGINS` | — | أصول مفصولة بفواصل (أصل الواجهة) |
| `JWT_ACCESS_SECRET` | ✅ | **≥ 32 حرفاً**، عشوائي قويّ |
| `JWT_REFRESH_SECRET` | ✅ | **≥ 32 حرفاً**، مختلف عن الأول |
| `ACCESS_TOKEN_TTL_MIN` | — | افتراضي 15 دقيقة |
| `REFRESH_TOKEN_TTL_DAYS` | — | افتراضي 7 أيام |
| `RESEND_API_KEY` | — | غيابه يُعطّل البريد الفعلي (بلا إسقاط) |
| `EMAIL_FROM` | — | عنوان المُرسِل |
| `FRONTEND_URL` | — | لروابط إعادة تعيين كلمة المرور |
| `BACKUP_DIR` | — | مجلد النسخ (افتراضي `storage/backups`) |
| `BACKUP_ENCRYPTION_KEY` | — | مفتاح AES-256؛ غيابه يُعطّل التشفير |
| `BACKUP_S3_*` | — | Scaffold تخزين سحابي (bucket/region/keys/endpoint) |

> يُتحقَّق من البيئة عند الإقلاع؛ نقص متغيّر إلزامي يُسقط الخادم برسالة واضحة.

### Admin (`apps/admin/.env`)
| المتغيّر | ملاحظة |
|---|---|
| `NEXT_PUBLIC_API_URL` | جذر الـ API، مثل `https://api.example.com/api/v1` |

## 2) قاعدة البيانات (Migrations)
```bash
pnpm --filter @laundry/api exec prisma generate
pnpm --filter @laundry/api exec prisma migrate deploy   # يطبّق الهجرات فقط، لا db push
```
> **لا تستخدم `prisma db push` على الإنتاج.** الهجرات مصدر الحقيقة.

## 3) البناء
```bash
pnpm install --frozen-lockfile
pnpm --filter @laundry/api build      # tsc → dist/
pnpm --filter @laundry/admin build    # next build → .next/
```

## 4) التشغيل
```bash
pnpm --filter @laundry/api start      # node dist/server.js
pnpm --filter @laundry/admin start    # next start
```
يُنصَح بمدير عمليات (PM2/systemd) أو حاويات، خلف عاكس (Nginx/Caddy) ينهي TLS.

## 5) ملاحظات إنتاجية
- **الأمان مُهيّأ مسبقاً:** `helmet` (رؤوس + CSP + HSTS)، `trust proxy` عند الإنتاج،
  كوكي refresh `httpOnly + secure + sameSite=strict`، حدّ جسم 1MB،
  Rate-limit على المصادقة/التصدير/الباركود.
- **عاكس عكسي:** مرِّر `X-Forwarded-*` (مطلوب لصحّة `req.ip` مع Rate-limit).
- **إغلاق أنيق:** الخادم يغلق متصفّح Puppeteer عند `SIGINT/SIGTERM` (لا تسريب).
- **النسخ الاحتياطي:** جدّد `BACKUP_DIR` خارج مسار النشر أو استخدم S3؛ فعّل
  `BACKUP_ENCRYPTION_KEY` للنسخ المُشفّرة.
- **الجدولة:** مُجدوِل الإشعارات يعمل داخل عملية الـ API (نسخة واحدة؛ قفل موزّع
  خارج النطاق الحالي — شغّل نسخة API واحدة للمُجدوِل أو افصله).

## 6) قائمة تحقّق ما قبل الإطلاق
- [ ] أسرار JWT قويّة (≥32) ومختلفة، ومحفوظة في مدير أسرار.
- [ ] `DATABASE_URL` للإنتاج + `migrate deploy` مُطبَّقة.
- [ ] `NODE_ENV=production` + `CORS_ORIGINS` = أصل الواجهة فقط.
- [ ] `NEXT_PUBLIC_API_URL` يشير للـ API الإنتاجي عبر HTTPS.
- [ ] TLS عند العاكس + تمرير Forwarded headers.
- [ ] تخزين النسخ الاحتياطي دائم + التشفير مُفعَّل.
- [ ] CI أخضر على الوسم/الفرع المنشور.
