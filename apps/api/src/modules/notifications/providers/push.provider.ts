import type { ChannelProvider, ChannelSendPayload } from "../notification.types.js";

/**
 * قناة Push - Scaffold فقط. لا تكامل FCM/APNs بعد، ولا جهاز/توكين مُسجَّل بأي مكان
 * بالمشروع حالياً (يتطلب تطبيق موبايل/متصفح يسجّل توكيناً أولاً - خارج نطاق هذه المرحلة).
 * configured=false → الجدولة تتخطى الصفوف فوراً بحالة SKIPPED.
 */
export class PushProvider implements ChannelProvider {
  readonly configured = false;

  send(_payload: ChannelSendPayload): Promise<void> {
    return Promise.reject(new Error("Push provider غير مُهيَّأ - لا تكامل FCM/APNs بعد"));
  }
}
