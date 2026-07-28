import { env } from "../../config/env.js";
import { ResendEmailProvider } from "./email.provider.js";
import { EmailService } from "./email.service.js";

/**
 * Composition Root لوحدة البريد - المزود الافتراضي Resend.
 * استبداله مستقبلاً بـSMTP/SendGrid/Mailgun يعني فقط استبدال هذا السطر
 * بمزود جديد يُنفِّذ EmailProvider - بلا أي تعديل على auth module.
 */
export function buildEmailService(): EmailService {
  const provider = new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  return new EmailService(provider);
}

// الواجهة العامة للـ Module
export { EmailService } from "./email.service.js";
export type { EmailProvider, InvoiceEmailData, SendEmailParams } from "./email.types.js";
