import { Resend } from "resend";
import type { EmailProvider, SendEmailParams } from "./email.types.js";

/**
 * تنفيذ Resend - المزود الافتراضي. أي مزود بديل (SMTP/SendGrid/Mailgun)
 * يكفي أن يُنفِّذ EmailProvider بنفس التوقيع ليحل محله بـComposition Root
 * (email/index.ts) بلا أي تعديل على auth module أو EmailService.
 *
 * بلا مفتاح حقيقي (RESEND_API_KEY غير مُهيَّأ): send() يرفض بخطأ واضح بدل
 * محاولة إرسال وهمية - الخادم نفسه لا يُسقَط عند الإقلاع (متغير بيئة اختياري).
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend | null;

  constructor(
    apiKey: string | undefined,
    private readonly from: string,
  ) {
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async send(params: SendEmailParams): Promise<void> {
    if (!this.client) {
      throw new Error(
        "RESEND_API_KEY غير مُهيَّأ - تعذَّر إرسال البريد. أضِفه لمتغيرات البيئة لتفعيل الإرسال الحقيقي.",
      );
    }

    const { error } = await this.client.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.attachments
        ? {
            attachments: params.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
            })),
          }
        : {}),
    });

    if (error) {
      throw new Error(`فشل إرسال البريد عبر Resend: ${error.message}`);
    }
  }
}
