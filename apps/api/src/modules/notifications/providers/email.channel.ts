import type { EmailService } from "../../email/index.js";
import type { ChannelProvider, ChannelSendPayload } from "../notification.types.js";

/**
 * قناة البريد - تلفّ EmailService الموجود (Resend) بدل إنشاء عميل Resend ثانٍ.
 * configured=true دائماً: التكامل حقيقي بالكود؛ جاهزية RESEND_API_KEY نفسها
 * مسؤولية EmailProvider (يرفض بخطأ واضح إن غاب المفتاح - يُعامَل كفشل تسليم قابل لإعادة المحاولة)
 */
export class EmailChannelProvider implements ChannelProvider {
  readonly configured = true;

  constructor(private readonly emailService: EmailService) {}

  async send(payload: ChannelSendPayload): Promise<void> {
    await this.emailService.sendRaw({
      to: payload.to,
      subject: payload.title,
      html: payload.html ?? `<p>${payload.body}</p>`,
      text: payload.text ?? payload.body,
    });
  }
}
