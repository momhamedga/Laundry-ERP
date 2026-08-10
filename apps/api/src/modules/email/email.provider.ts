import { Resend } from "resend";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { EmailProvider, SendEmailParams } from "./email.types.js";

/**
 * تنفيذ Resend - المزود الافتراضي. أي مزود بديل (SMTP/SendGrid/Mailgun)
 * يكفي أن يُنفِّذ EmailProvider بنفس التوقيع ليحل محله بـComposition Root
 * (email/index.ts) بلا أي تعديل على auth module أو EmailService.
 *
 * بلا مفتاح حقيقي (RESEND_API_KEY غير مُهيَّأ): send() يرفض بخطأ واضح بدل
 * محاولة إرسال وهمية - الخادم نفسه لا يُسقَط عند الإقلاع (متغير بيئة اختياري).
 *
 * الرفض بـApiError لا بـError عادي: الأخير يسقط في الفرع العام للمعالج المركزي
 * فيتحوّل إلى 500 و«حدث خطأ غير متوقّع في النظام» — وهي إفادة خاطئة (العطل في
 * التهيئة أو عند المزوّد، لا في الشيفرة) وتترك المستخدم بلا أي دليل على السبب.
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
      throw new ApiError(
        503,
        "خدمة البريد غير مُفعَّلة على الخادم (مفتاح المزوّد غير مضبوط). راجع مسؤول النظام.",
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
      // نصّ المزوّد إنجليزي وتقنيّ («domain is not verified»، «invalid from»)،
      // فيُسجَّل كاملاً للتشخيص ولا يُعرَض كما هو داخل واجهة عربية.
      console.error("💥 فشل إرسال البريد عبر Resend:", error);
      throw new ApiError(
        502,
        "تعذّر إرسال البريد عبر مزوّد الخدمة. أعد المحاولة، وإن تكرّر راجع مسؤول النظام.",
      );
    }
  }
}
