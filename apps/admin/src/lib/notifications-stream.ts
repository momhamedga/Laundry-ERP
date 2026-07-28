import { API_BASE_URL } from "@/constants/config";
import { useAuthStore } from "@/store/auth-store";

type NotificationStreamHandler = (payload: unknown) => void;

/**
 * عميل SSE عبر fetch + ReadableStream - وليس EventSource الأصلي، لأن
 * Authorization: Bearer (التوكين بالذاكرة) لا يمكن إرفاقه بـ EventSource
 * (لا يدعم Headers مخصصة). "Infinite Refresh": إعادة اتصال تلقائية دائمة
 * طالما الهيدر (وبالتالي الجرس) مُركَّب - Singleton واحد للتطبيق كله.
 */
let controller: AbortController | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function scheduleRetry(onNotification: NotificationStreamHandler, delayMs: number): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void connect(onNotification), delayMs);
}

async function connect(onNotification: NotificationStreamHandler): Promise<void> {
  if (!started) return; // أُوقف قبل أن تُنفَّذ إعادة المحاولة المجدولة

  const token = useAuthStore.getState().accessToken;
  if (!token) {
    scheduleRetry(onNotification, 5000);
    return;
  }

  controller = new AbortController();
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      scheduleRetry(onNotification, 5000);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (started) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue; // نبضة قلب (": heartbeat") أو تعليق آخر - تجاهل
        try {
          onNotification(JSON.parse(dataLine.slice("data: ".length)));
        } catch {
          // إطار تالف - لا يوقف الاتصال بالكامل
        }
      }
    }

    if (started) scheduleRetry(onNotification, 1000); // انتهى الـ Stream طبيعياً - نادر
  } catch (err) {
    if ((err as Error).name === "AbortError") return; // إيقاف متعمد
    scheduleRetry(onNotification, 5000);
  }
}

/** يبدأ اتصالاً مستمراً؛ لا تأثير إن كان مُشغَّلاً بالفعل (Idempotent). يُعيد دالة إيقاف. */
export function startNotificationsStream(onNotification: NotificationStreamHandler): () => void {
  if (started) return () => {};
  started = true;
  void connect(onNotification);

  return () => {
    started = false;
    controller?.abort();
    if (retryTimer) clearTimeout(retryTimer);
  };
}
