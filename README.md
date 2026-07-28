# Laundry ERP — نظام إدارة المغاسل الاحترافي

نظام Enterprise لإدارة المغاسل يعمل عبر Desktop / Web / Android / iPhone على قاعدة بيانات واحدة.

## هيكل المشروع (Monorepo)

```
laundry-erp/
├── apps/
│   └── api/          # Backend REST API (Express + Prisma + PostgreSQL)
├── packages/         # الحزم المشتركة
├── pnpm-workspace.yaml
└── package.json
```

## المتطلبات

- Node.js >= 20
- pnpm >= 9
- قاعدة بيانات PostgreSQL (Neon)

## التشغيل السريع

```bash
# 1) تثبيت الاعتماديات
pnpm install

# 2) إعداد المتغيرات البيئية
# انسخ apps/api/.env.example إلى apps/api/.env وضع رابط قاعدة البيانات

# 3) توليد Prisma Client
pnpm db:generate

# 4) تنفيذ الهجرات على قاعدة البيانات
pnpm db:migrate

# 5) تشغيل الـ API
pnpm api:dev
```

ثم افتح: http://localhost:4000/api/v1/health
