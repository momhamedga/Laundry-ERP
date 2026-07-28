-- Phase 4B: توسعة NotificationType لتغطية كل أحداث النظام الحقيقية
-- RENAME VALUE آمن هنا لأن جدول notifications فارغ حالياً (بيانات اختبار 4A حُذفت بالكامل)
ALTER TYPE "NotificationType" RENAME VALUE 'PAYMENT_RECORDED' TO 'PAYMENT_RECEIVED';

ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_REFUNDED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'BACKUP_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_LOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_RESET';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_SETTINGS_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_DISABLED';
