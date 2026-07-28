import type { NotificationChannel } from "@prisma/client";
import type { ChannelProvider } from "../notification.types.js";

/**
 * سجل مزوّدي القنوات الخارجية (EMAIL/SMS/WHATSAPP/PUSH) - IN_APP ليس له مزوّد هنا
 * عمداً: صف Notification نفسه هو تسليم IN_APP، تُبَث عبر SSE مباشرة بالخدمة
 * بلا مرور بصف Outbox/مزوّد إطلاقاً.
 */
export class ChannelRegistry {
  private readonly providers = new Map<NotificationChannel, ChannelProvider>();

  register(channel: NotificationChannel, provider: ChannelProvider): void {
    this.providers.set(channel, provider);
  }

  get(channel: NotificationChannel): ChannelProvider | undefined {
    return this.providers.get(channel);
  }
}
