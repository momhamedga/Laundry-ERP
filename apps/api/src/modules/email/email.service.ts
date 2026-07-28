import { buildInvoiceEmail, buildPasswordResetEmail } from "./email.templates.js";
import type { EmailProvider, InvoiceEmailData, SendEmailParams } from "./email.types.js";

/**
 * واجهة البريد العامة لبقية الوحدات (auth, invoices) - لا تعرف شيئاً عن Resend
 * أو أي مزود تحديداً، فقط تتحدث مع EmailProvider. استبدال المزود لا يمسّ هذا الملف.
 */
export class EmailService {
  constructor(private readonly provider: EmailProvider) {}

  async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const { subject, html, text } = buildPasswordResetEmail({ resetUrl, expiresInMinutes });
    await this.provider.send({ to, subject, html, text });
  }

  /** يُرسِل الفاتورة كـPDF مُرفَق حقيقي - pdfBuffer يُبنى بوحدة invoices عبر Puppeteer */
  async sendInvoiceEmail(
    to: string,
    data: InvoiceEmailData,
    pdfBuffer: Buffer,
    pdfFilename: string,
  ): Promise<void> {
    const { subject, html, text } = buildInvoiceEmail(data);
    await this.provider.send({
      to,
      subject,
      html,
      text,
      attachments: [{ filename: pdfFilename, content: pdfBuffer }],
    });
  }

  /**
   * إرسال عام بمحتوى جاهز مسبقاً - لمستهلكين يبنون قالبهم الخاص خارج هذا الملف
   * (حالياً: notifications module). لا تُضِف هنا قوالب جديدة خاصة بمستهلك واحد -
   * أبقِ القوالب المتخصصة (كلمة السر/الفاتورة) في email.templates.ts فقط.
   */
  async sendRaw(params: SendEmailParams): Promise<void> {
    await this.provider.send(params);
  }
}
