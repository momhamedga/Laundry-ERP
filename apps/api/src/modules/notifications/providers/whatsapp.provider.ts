import type { ChannelProvider, ChannelSendPayload } from "../notification.types.js";

/**
 * قناة WhatsApp - Scaffold فقط. لا تكامل حقيقي مع WhatsApp Business API بعد.
 * configured=false → الجدولة تتخطى الصفوف فوراً بحالة SKIPPED (راجع sms.provider.ts
 * لنفس الشرح التفصيلي - النمط مطابق تماماً).
 *
 * لتفعيلها مستقبلاً: نفّذ send() عبر Meta Cloud API (أو مزوّد وسيط مثل Twilio)،
 * اضبط configured=true، واحقن الأسرار عبر config/env.ts.
 */
export class WhatsAppProvider implements ChannelProvider {
  readonly configured = false;

  send(_payload: ChannelSendPayload): Promise<void> {
    return Promise.reject(
      new Error("WhatsApp provider غير مُهيَّأ - لا تكامل WhatsApp Business API بعد"),
    );
  }
}
