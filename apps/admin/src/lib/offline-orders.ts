import { offlineApi } from "@/lib/offline-router";
import type { LocalOrderWithItems, NewOrderItem } from "@/lib/offline-types";
import type { CreateOrderInput, OrderDetail } from "@/types/orders";

/**
 * إنشاء طلب في قاعدة SQLite المحلّية حين تتعذّر قاعدة البيانات البعيدة.
 *
 * ═══════════ من أين تأتي الأسعار ═══════════
 * الخادم يحسب الأسعار من كتالوج الخدمات، وهو ما لا نملكه دون اتصال. لذلك
 * نقرؤها من cached_services — الكاش الذي يُملأ أثناء الاتصال لهذا الغرض
 * بالذات. لا نثق بسعر يرسله العميل: لو غاب معرّف الخدمة من الكاش نفشل
 * صراحةً بدل أن نُنشئ طلباً بسعر صفر يُفسد الحسابات ثم يُزامَن.
 *
 * الطلب المُنشأ هنا بلا رقم رسمي: توليد الأرقام مركزي على الخادم، وأي رقم
 * نخترعه محلّياً سيصطدم بأرقام الأجهزة الأخرى. يمنحه الخادم رقمه عند
 * المزامنة، وجدول id_map يربط المعرّف المحلّي بالبعيد.
 */

interface CachedService {
  id: string;
  name: string;
  price: number;
  is_active: number;
}

/** يبني خريطة سعر لكل خدمة من الكاش المحلّي */
async function servicePrices(): Promise<Map<string, CachedService>> {
  const api = offlineApi();
  if (!api) throw new Error("الوضع دون اتصال غير متاح خارج تطبيق سطح المكتب");

  const rows = (await api.cache.read("services")) as unknown as CachedService[];
  return new Map(rows.map((r) => [r.id, r]));
}

/** ينشئ الطلب محلّياً ويعيده بشكل OrderDetail الذي تتوقّعه الواجهة */
export async function createOrderLocally(input: CreateOrderInput): Promise<OrderDetail> {
  const api = offlineApi();
  if (!api) throw new Error("الوضع دون اتصال غير متاح خارج تطبيق سطح المكتب");

  const prices = await servicePrices();

  const items: NewOrderItem[] = input.items.map((it) => {
    const svc = prices.get(it.serviceId);
    if (!svc) {
      throw new Error(
        "بيانات الخدمات غير متوفّرة على هذا الجهاز. اتصل بالإنترنت مرة واحدة ثم أعد المحاولة.",
      );
    }
    return {
      service_id: it.serviceId,
      quantity: it.quantity,
      unit_price: svc.price,
      discount: it.discount,
    };
  });

  const local = await api.orders.create({
    customer_id: input.customerId,
    branch_id: input.branchId,
    items,
    discount: input.discount,
    notes: input.notes ?? undefined,
    due_date: input.dueDate,
  });

  const customer = await api.customers.get(input.customerId).catch(() => null);
  return toOrderDetail(local, customer?.name ?? "—");
}

/**
 * يحوّل صفّ SQLite إلى شكل OrderDetail.
 *
 * الأعمدة أرقام والحقول المقابلة نصوص لأن الخادم يعيد Decimal كنصّ حفاظاً
 * على الدقّة، والواجهة تتعامل معها على هذا الأساس. الحقول التي لا وجود لها
 * محلّياً (الفرع، مُنشئ الطلب) تُملأ بقيم فارغة: شاشة النجاح لا تقرؤها،
 * وأي شاشة تقرؤها لن تُفتح على طلب محلّي أصلاً.
 */
function toOrderDetail(o: LocalOrderWithItems, customerName: string): OrderDetail {
  return {
    id: o.id,
    // فارغ = «قيد المزامنة». الواجهة تعرضه كذلك بدل رقم مخترَع يوهم بالرسمية
    orderNumber: o.order_number ?? "",
    status: o.status as OrderDetail["status"],
    paymentStatus: o.payment_status as OrderDetail["paymentStatus"],
    subtotal: String(o.subtotal),
    discount: String(o.discount),
    total: String(o.total),
    paidAmount: String(o.paid_amount),
    notes: o.notes,
    receivedAt: o.received_at ?? o.created_at,
    dueDate: o.due_date ?? o.created_at,
    deliveredAt: null,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    customerId: o.customer_id ?? "",
    branchId: o.branch_id ?? "",
    createdById: "",
    customer: { id: o.customer_id ?? "", name: customerName, phone: "" },
    branch: { id: o.branch_id ?? "", name: "" },
    createdBy: { id: "", name: "" },
    items: o.items.map((it) => ({
      id: it.id,
      serviceId: it.service_id ?? "",
      quantity: String(it.quantity),
      unitPrice: String(it.unit_price),
      discount: String(it.discount),
      subtotal: String(it.subtotal),
      service: { id: it.service_id ?? "", name: "", unit: "PIECE" },
    })) as OrderDetail["items"],
  };
}
