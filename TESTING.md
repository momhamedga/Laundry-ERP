# Testing Strategy

نظام اختبار متعدّد الطبقات لـ Laundry ERP. الهدف: بوّابة جودة حتمية في CI + ثقة
في منطق الأعمال الحرج، مع فصل واضح بين الطبقات.

## طبقات الاختبار

| الطبقة | الأداة | تُشغَّل في CI؟ | ما تُغطّيه |
|---|---|---|---|
| **Unit (API)** | Vitest (Node) | ✅ نعم | منطق الأعمال/التحقّق/الأدوات النقيّة — بلا قاعدة بيانات أو شبكة |
| **Unit (Admin)** | Vitest + jsdom + Testing Library | ✅ نعم | أدوات العرض، مرآة الصلاحيات، وعرض مكوّن (component render) |
| **Integration (حيّ)** | سكربتات HTTP مقابل الـ API الحقيقي + Neon Postgres | ⚠️ يدوي | التدفّق الكامل عبر الوحدات (Orders→Payments→Invoices→…→Day Closing) |
| **Regression / Security / Performance** | نفس منهج الـ HTTP الحيّ | ⚠️ يدوي | منع الكسر، RBAC/الانتحال/التجاوزات، أحجام كبيرة |

### لماذا التكامل "حيّ" وليس آلياً في CI؟
اختبارات التكامل الحقيقية تتطلّب Postgres مُهيّأة (Neon). حِفاظاً على حتمية بوّابة CI
(بلا اعتماد على قاعدة خارجية)، **طبقة الوحدات فقط** هي بوّابة الدمج. طبقة التكامل
تُشغَّل يدويّاً/مجدولةً مقابل قاعدة حقيقية (وقد شُغِّلت خضراء في نهاية كل مرحلة بناء).
لتفعيلها آلياً مستقبلاً: أضِف خدمة `postgres` إلى مصفوفة CI + `prisma migrate deploy`
ثم شغّل مجموعة التكامل — انظر "المتبقّي" أدناه.

## التشغيل محليّاً

```bash
# الكل
pnpm --filter @laundry/api test          # وحدات الـ API
pnpm --filter @laundry/admin test        # وحدات الواجهة

# مع التغطية
pnpm --filter @laundry/api test:coverage
pnpm --filter @laundry/admin test:coverage

# مراقبة أثناء التطوير
pnpm --filter @laundry/api test:watch
```

## ما يُغطّيه الاختبار الآلي حاليّاً

**API (`apps/api/tests/`) — 46 اختباراً:**
- `auth/permissions` — RBAC + دمج التجاوزات (`computeEffectivePermissions`): منح/سحب/تجاهل غير معروف/عدم تغيير المصدر.
- `auth/jwt` — توقيع/تحقّق + ادّعاء الانتحال `imp` + رفض التوكين المشوَّه/المُلاعَب.
- `hr/hr-constants` — مساعدات التاريخ (`toDateOnly`/`inclusiveDays`/`todayDate`).
- `hr/payroll.service` — حساب الراتب: `net = base + بدلات + مكافآت + إضافي − (خصومات + غياب)`، إضافي ×1.5، رفض الفترة المكرّرة/بلا موظفين.
- `hr/hr` + `validators/*` — قواعد Zod (ترتيب تواريخ الإجازة/الرواتب، cuid، القيم غير السالبة، force، سبب إعادة الفتح).
- `day-closing/constants` + `day-closing/pre-close.service` — منطق فحص ما قبل الإغلاق (blocking/warning/info + بوّابة force).
- `notifications/recipients` — سلامة خريطة أدوار المستقبِلين + كشف الأحداث المُوجَّهة.

**Admin (`apps/admin/tests/`) — 17 اختباراً:**
- `format` — عملة/تاريخ/وقت (بما فيها null → «—»).
- `permissions` — مرآة RBAC الأمامية (`hasPermission`/`hasAnyRole` + سلامة الخريطة).
- `hr-format` + `day-format` — خرائط التسميات/الشارات + `minutesToHhMm` + `differenceTone`.
- `metric-card` — عرض مكوّن React فعلي في jsdom (عنوان/قيمة + نبرة destructive).

## فلسفة التغطية (بصدق)

طبقة الوحدات تقيس **منطق الأعمال النقيّ** فقط. تُستثنى من المقام: `repositories`
(أغلفة Prisma رقيقة)، `controllers`/`routes` (تجميع HTTP)، والخادم — لأنها من
اختصاص طبقة التكامل الحيّة. لذلك:

- تغطية وحدات الواجهة على طبقة المنطق (`lib`/`constants`): **~59%**.
- تغطية وحدات الـ API عالميّاً منخفضة لأن وحدات كثيرة قديمة (orders/payments/inventory/…)
  ليس لها اختبارات وحدة بعد، ومنطقها مُتحقَّق عبر التكامل الحيّ. **الأرقام حقيقية
  ومقيسة — لم يُدَّعَ 95%.** رفعُها هو عمل مخطَّط (انظر أدناه).

## المتبقّي لبلوغ تغطية Enterprise كاملة
1. طبقة تكامل آلية في CI (خدمة Postgres + `migrate deploy` + مجموعة HTTP).
2. اختبارات وحدة لكل خدمة/وحدة قديمة (orders/payments/inventory/loyalty/barcode/backup/reports).
3. اختبارات مكوّنات/hooks أوسع للواجهة (نماذج/جداول/حوارات) عبر Testing Library.
4. اختبارات أداء محمّلة (k6/Artillery) لسيناريوهات الأحجام الكبيرة.
