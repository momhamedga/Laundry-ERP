import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderListRow } from "@/types/orders";

/**
 * شاشة التسليمات.
 *
 * أهمّ ما يُختبَر هنا ليس الشكل بل **أن التصفية تصل الخادم**: مطلب الأداء يمنع
 * جلب كل الطلبات ثم غربلتها في المتصفّح، ومخالفته لا تُنتج خطأً — تُنتج شاشةً
 * تعمل اليوم وتتباطأ تدريجياً حتى تصير غير صالحة بعد ألف طلب.
 * لذلك تُفحص المعاملات المُمرَّرة إلى useOrdersQuery نفسها.
 */
const ordersQuery = vi.fn();
const capturedFilters: Record<string, unknown>[] = [];

function makeOrder(overrides: Partial<OrderListRow> = {}): OrderListRow {
  return {
    id: "o1",
    orderNumber: "ORD-2026-000001",
    status: "READY",
    paymentStatus: "UNPAID",
    subtotal: "500",
    discount: "0",
    total: "500",
    paidAmount: "200",
    notes: null,
    receivedAt: "2026-08-10T08:00:00.000Z",
    dueDate: "2026-08-11T18:00:00.000Z",
    deliveredAt: null,
    createdAt: "2026-08-10T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
    customerId: "c1",
    branchId: "b1",
    createdById: "u1",
    customer: { id: "c1", name: "محمد جمال", phone: "01214115724" },
    branch: { id: "b1", name: "الفرع الرئيسي" },
    _count: { items: 3 },
    ...overrides,
  } as OrderListRow;
}

vi.mock("@/hooks/use-orders", () => ({
  useOrdersQuery: (filters: Record<string, unknown>) => {
    capturedFilters.push(filters);
    return ordersQuery();
  },
  useOrderDetailQuery: () => ({ data: undefined }),
}));

vi.mock("@/hooks/use-branches", () => ({
  useActiveBranchesQuery: () => ({
    data: [
      { id: "b1", name: "الفرع الرئيسي" },
      { id: "b2", name: "فرع المعادي" },
    ],
  }),
}));

let permissions: string[] = [];
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ can: (p: string) => permissions.includes(p) }),
}));

// الحوارات مُختبَرة في سياقها الأصلي — هنا يهمّ استدعاؤها لا محتواها
vi.mock("@/components/orders/order-details-drawer", () => ({
  OrderDetailsDrawer: ({ orderId }: { orderId: string | null }) =>
    orderId ? <div data-testid="details-drawer">{orderId}</div> : null,
}));
vi.mock("@/components/orders/update-status-dialog", () => ({
  UpdateStatusDialog: () => <div data-testid="status-dialog" />,
}));
vi.mock("@/components/payments/create-payment-dialog", () => ({
  CreatePaymentDialog: () => <div data-testid="payment-dialog" />,
}));

const { DeliveriesView } = await import("@/components/deliveries/deliveries-view");

const PAGE_META = { page: 1, limit: 50, total: 120, totalPages: 3, hasNext: true, hasPrev: false };

function lastFilters() {
  return capturedFilters[capturedFilters.length - 1]!;
}

beforeEach(() => {
  capturedFilters.length = 0;
  permissions = ["payments:create", "orders:update-status"];
  ordersQuery.mockReturnValue({
    data: { orders: [makeOrder()], meta: PAGE_META },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe("تصفية على الخادم لا في المتصفّح", () => {
  it("النطاق الافتراضي «اليوم» يُرسَل كـdueFrom/dueTo", () => {
    render(<DeliveriesView />);
    const f = lastFilters();

    expect(f.dueFrom).toBeDefined();
    expect(f.dueTo).toBeDefined();
    expect(f.sortBy).toBe("dueDate");
    expect(f.sortOrder).toBe("asc");
  });

  it("«متأخّرة» ترسل dueTo وحدها", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView />);
    await user.click(screen.getByRole("button", { name: "متأخّرة" }));

    const f = lastFilters();
    expect(f.dueTo).toBeDefined();
    expect(f.dueFrom).toBeUndefined();
  });

  it("«جاهزة للتسليم فقط» تُرسَل كـstatus=READY لا تُصفّى محلياً", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView />);
    await user.click(screen.getByRole("button", { name: /جاهزة للتسليم فقط/ }));

    expect(lastFilters().status).toBe("READY");
  });

  it("حدّ الصفحة مضبوط — لا جلب بلا حدّ", () => {
    render(<DeliveriesView />);
    expect(lastFilters().limit).toBe(50);
    expect(lastFilters().page).toBe(1);
  });
});

describe("الترقيم", () => {
  it("يعرض شريط الترقيم معتمداً على meta من الخادم", () => {
    render(<DeliveriesView />);
    // الشريط العام يعرض إجمالي النتائج القادم من الخادم لا من طول المصفوفة
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it("تغيير المرشّح يعيد الصفحة إلى الأولى", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView />);

    await user.click(screen.getByRole("button", { name: "متأخّرة" }));
    expect(lastFilters().page).toBe(1);
  });

  it("الملخّص يقول «في هذه الصفحة» — لا يدّعي أنه إجمالي كل النتائج", () => {
    render(<DeliveriesView />);
    expect(screen.getByText(/في هذه الصفحة/)).toBeInTheDocument();
  });
});

describe("عرض الصفوف", () => {
  it("يعرض رقم الطلب والعميل والقطع والمتبقّي والفرع", () => {
    render(<DeliveriesView />);

    expect(screen.getByText("ORD-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("محمد جمال")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("الفرع الرئيسي")).toBeInTheDocument();
  });

  it("هاتف العميل رابط اتصال مباشر", () => {
    render(<DeliveriesView />);
    const link = screen.getByRole("link", { name: /01214115724/ });
    expect(link).toHaveAttribute("href", "tel:01214115724");
  });

  it("المتأخّر مميَّز بنصّ لا بلون وحده", () => {
    ordersQuery.mockReturnValue({
      data: { orders: [makeOrder({ dueDate: "2020-01-01T00:00:00.000Z" })], meta: PAGE_META },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<DeliveriesView />);

    expect(screen.getByText("متأخّر")).toBeInTheDocument();
  });

  it("المسدَّد بالكامل لا يعرض زرّ الدفع", () => {
    ordersQuery.mockReturnValue({
      data: { orders: [makeOrder({ total: "500", paidAmount: "500" })], meta: PAGE_META },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<DeliveriesView />);

    expect(screen.queryByLabelText(/تسجيل دفعة/)).not.toBeInTheDocument();
    expect(screen.getByText("مسدَّد")).toBeInTheDocument();
  });

  it("قائمة فارغة تعرض حالة فارغة مفهومة", () => {
    ordersQuery.mockReturnValue({
      data: { orders: [], meta: PAGE_META },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<DeliveriesView />);

    expect(screen.getByText("لا تسليمات في هذا النطاق")).toBeInTheDocument();
  });

  it("فشل الجلب يعرض خطأً قابلاً لإعادة المحاولة", () => {
    ordersQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("فشل"),
      refetch: vi.fn(),
    });
    render(<DeliveriesView />);

    expect(screen.getByText("تعذّر تحميل التسليمات")).toBeInTheDocument();
  });
});

describe("الصلاحيات", () => {
  it("بلا payments:create لا يظهر زرّ الدفع", () => {
    permissions = ["orders:update-status"];
    render(<DeliveriesView />);
    expect(screen.queryByLabelText(/تسجيل دفعة/)).not.toBeInTheDocument();
  });

  it("بلا orders:update-status لا يظهر زرّ التسليم", () => {
    permissions = ["payments:create"];
    render(<DeliveriesView />);
    expect(screen.queryByRole("button", { name: /^تسليم$/ })).not.toBeInTheDocument();
  });

  it("بالصلاحيتين يظهر الزرّان", () => {
    render(<DeliveriesView />);
    expect(screen.getByLabelText(/تسجيل دفعة/)).toBeInTheDocument();
    // اسم دقيق: /تسليم/ يطابق أيضاً عنوان عمود «موعد التسليم» وزرّ «جاهزة للتسليم»
    expect(screen.getByRole("button", { name: "تسليم" })).toBeInTheDocument();
  });
});

describe("الإجراءات", () => {
  it("عرض التفاصيل يفتح الدرج بمعرّف الطلب", async () => {
    const user = userEvent.setup();
    render(<DeliveriesView />);

    await user.click(screen.getByLabelText(/عرض تفاصيل الطلب/));
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("o1");
  });
});
