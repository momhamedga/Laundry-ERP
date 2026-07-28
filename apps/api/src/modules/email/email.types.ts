/** مرفق بريد خام - Buffer جاهز، عام لأي مزود */
export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

/** بريد خام جاهز للإرسال - عام لأي مزود */
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** اختياري - غيابه يعني بريداً بلا مرفقات (الحالة الحالية الوحيدة: استعادة كلمة السر) */
  attachments?: EmailAttachment[];
}

/**
 * عقد عام لأي مزود بريد - Resend هو التنفيذ الافتراضي (email.provider.ts)،
 * لكن أي بديل (SMTP/SendGrid/Mailgun) يكفي أن يُنفِّذ هذا العقد ليُستبدَل
 * في Composition Root (email/index.ts) بلا أي تعديل على auth module أو
 * أي مستهلك آخر لـ EmailService.
 */
export interface EmailProvider {
  send(params: SendEmailParams): Promise<void>;
}

/** بيانات قالب إعادة تعيين كلمة المرور */
export interface PasswordResetEmailData {
  resetUrl: string;
  expiresInMinutes: number;
}

/** بيانات قالب إرسال فاتورة - القيم جاهزة نصياً (مُنسَّقة) من طبقة الفواتير، لا منطق تنسيق هنا */
export interface InvoiceEmailData {
  companyName: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  totalFormatted: string;
  statusLabel: string;
}
