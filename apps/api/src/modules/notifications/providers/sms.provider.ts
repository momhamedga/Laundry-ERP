import type { ChannelProvider, ChannelSendPayload } from "../notification.types.js";

/**
 * قناة SMS - Scaffold فقط. لا بوّابة SMS حقيقية مُدمجة بالكود بعد (لا Twilio/غيره).
 * configured=false يعني: الجدولة (notification.scheduler) تتخطى صفوف SMS فوراً
 * بحالة SKIPPED بلا استهلاك محاولات إعادة على فشل مؤكد سلفاً.
 *
 * لتفعيلها مستقبلاً: نفّذ send() باستدعاء بوّابة حقيقية (مثال Twilio)، اضبط
 * configured=true، واحقن أي أسرار API عبر config/env.ts (نفس نمط RESEND_API_KEY).
 */
export class SmsProvider implements ChannelProvider {
  readonly configured = false;

  send(_payload: ChannelSendPayload): Promise<void> {
    return Promise.reject(
      new Error("SMS provider غير مُهيَّأ - لا بوّابة SMS مُدمجة بالكود بعد"),
    );
  }
}
