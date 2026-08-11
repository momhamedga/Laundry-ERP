import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenseRow } from "@/types/expenses";

/**
 * شاشة المصروفات.
 *
 * ما يُحرَس هنا: (1) التصفية تصل الخادم — الإجمالي المالي المعروض يجب أن يكون
 * إجمالي الخادم لكامل النتيجة لا مجموع صفٍّ ظاهر، و(2) الصلاحيات تُخفي ما لا
 * يملكه المستخدم، و(3) الملغى لا يُعرَض له زرّ تعديل. أخطاء هذه الثلاثة لا
 * تُظهر رسالة خطأ — تُظهر رقماً ماليّاً خاطئاً أو زرّاً ينتهي بـ409.
 */
const expensesQuery = vi.fn();
const summaryQuery = vi.fn();
const capturedParams: Record<string, unknown>[] = [];
const capturedSummaryParams: Record<string, unknown>[] = [];

function makeExpense(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
  return {
    id: "e1",
    amount: "500",
    category: "ELECTRICITY",
    status: "ACTIVE",
    notes: null,
    expenseDate: "2026-08-05T00:00:00.000Z",
    cancelledAt: null,
    cancelReason: null,
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    branchId: "b1",
    branch: { id: "b1", name: "الفرع الرئيسي" },
    createdById: "u1",
    createdBy: { id: "u1", name: "محمد جمال" },
    cancelledById: null,
    cancelledBy: null,
    ...overrides,
  };
}

vi.mock("@/hooks/use-expenses", () => ({
  useExpensesQuery: (params: Record<string, unknown>) => {
    capturedParams.push(params);
    return expensesQuery();
  },
  useOperatingSummaryQuery: (params: Record<string, unknown>) => {
    capturedSummaryParams.push(params);
    return summaryQuery();
  },
  useExpenseQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreateExpenseMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useUpdateExpenseMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useCancelExpenseMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
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

const { ExpensesView } = await import("@/components/expenses/expenses-view");

const PAGE_META = { page: 1, limit: 20, total: 42, totalPages: 3, hasNext: true, hasPrev: false };

function lastParams() {
  return capturedParams[capturedParams.length - 1]!;
}

beforeEach(() => {
  capturedParams.length = 0;
  capturedSummaryParams.length = 0;
  permissions = ["expense:view", "expense:create", "expense:update", "expense:cancel"];
  expensesQuery.mockReturnValue({
    data: { expenses: [makeExpense()], totalAmount: "12500.75", meta: PAGE_META },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  summaryQuery.mockReturnValue({
    data: {
      from: "2026-08-01",
      to: "2026-08-31",
      branchId: null,
      revenue: "20000",
      expenses: "12500.75",
      operatingResult: "7499.25",
    },
  });
});

describe("التصفية على الخادم", () => {
  it("يبدأ بمدى الشهر الحالي وترتيب تنازلي بالتاريخ", () => {
    render(<ExpensesView />);
    const p = lastParams();
    // لحظات ISO لا تواريخ مجرّدة: التاريخ المجرّد يُقرأ عالمياً فيسقط يوم البداية
    expect(p.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(p.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(p.sortBy).toBe("expenseDate");
    expect(p.sortOrder).toBe("desc");
    expect(p.page).toBe(1);
  });

  it("مدى الشهر المُرسَل يغطّي أوّل يوم وآخره فعلياً", () => {
    render(<ExpensesView />);
    const p = lastParams();
    const now = new Date();
    const firstDayNoon = new Date(now.getFullYear(), now.getMonth(), 1, 12).toISOString();
    const lastDayNoon = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12).toISOString();
    expect(String(p.from) <= firstDayNoon).toBe(true);
    expect(String(p.to) >= lastDayNoon).toBe(true);
  });

  it("تغيير الفئة يُرسَل للخادم ويعيد الترقيم للصفحة الأولى", async () => {
    const user = userEvent.setup();
    render(<ExpensesView />);

    await user.click(screen.getByLabelText("الفئة"));
    await user.click(await screen.findByRole("option", { name: "إيجار" }));

    const p = lastParams();
    expect(p.category).toBe("RENT");
    expect(p.page).toBe(1);
  });

  it("«كل الفئات» يمسح المرشّح لا يرسل السلسلة all", async () => {
    const user = userEvent.setup();
    render(<ExpensesView />);

    await user.click(screen.getByLabelText("الفئة"));
    await user.click(await screen.findByRole("option", { name: "إيجار" }));
    await user.click(screen.getByLabelText("الفئة"));
    await user.click(await screen.findByRole("option", { name: "كل الفئات" }));

    expect(lastParams().category).toBeUndefined();
  });

  it("مرشّح الفرع يصل الخادم", async () => {
    const user = userEvent.setup();
    render(<ExpensesView />);

    await user.click(screen.getByLabelText("الفرع"));
    await user.click(await screen.findByRole("option", { name: "فرع المعادي" }));

    expect(lastParams().branchId).toBe("b2");
  });

  it("مرشّح الحالة يصل الخادم", async () => {
    const user = userEvent.setup();
    render(<ExpensesView />);

    await user.click(screen.getByLabelText("الحالة"));
    await user.click(await screen.findByRole("option", { name: "ملغى" }));

    expect(lastParams().status).toBe("CANCELLED");
  });
});

describe("الملخّص التشغيلي", () => {
  it("يتبع التاريخ والفرع دون الفئة", async () => {
    const user = userEvent.setup();
    render(<ExpensesView />);

    await user.click(screen.getByLabelText("الفئة"));
    await user.click(await screen.findByRole("option", { name: "إيجار" }));

    const s = capturedSummaryParams[capturedSummaryParams.length - 1]!;
    expect(s).not.toHaveProperty("category");
    expect(s.from).toBeDefined();
    expect(s.to).toBeDefined();
  });

  it("يعرض الإيراد والمصروف والناتج", () => {
    render(<ExpensesView />);
    expect(screen.getByText("الإيراد")).toBeInTheDocument();
    expect(screen.getByText("الناتج التشغيلي")).toBeInTheDocument();
  });
});

describe("الإجمالي المالي", () => {
  /** الإجمالي من الخادم لكامل النتيجة — مجموع الصفحة يعطي رقماً يتغيّر بالتصفّح */
  it("يعرض إجمالي الخادم لا مجموع الصفوف الظاهرة", () => {
    render(<ExpensesView />);
    // الصفّ الظاهر الوحيد قيمته 500، والمعروض 12500.75 ⇒ الرقم من الخادم قطعاً
    const footer = screen.getByText("إجمالي المصروفات النشطة (كل النتائج)").parentElement!;
    expect(within(footer).getByText(/12,?500\.75/)).toBeInTheDocument();
  });
});

describe("الصلاحيات", () => {
  it("بلا expense:create لا يظهر زرّ الإضافة", () => {
    permissions = ["expense:view"];
    render(<ExpensesView />);
    expect(screen.queryByRole("button", { name: /مصروف/ })).not.toBeInTheDocument();
  });

  it("بلا expense:update لا يظهر زرّ التعديل", () => {
    permissions = ["expense:view"];
    render(<ExpensesView />);
    expect(screen.queryByTitle("تعديل")).not.toBeInTheDocument();
  });

  it("بلا expense:cancel لا يظهر زرّ الإلغاء", () => {
    permissions = ["expense:view", "expense:update"];
    render(<ExpensesView />);
    expect(screen.queryByTitle("إلغاء")).not.toBeInTheDocument();
    expect(screen.getByTitle("تعديل")).toBeInTheDocument();
  });

  it("بكل الصلاحيات تظهر الثلاثة", () => {
    render(<ExpensesView />);
    expect(screen.getByTitle("عرض")).toBeInTheDocument();
    expect(screen.getByTitle("تعديل")).toBeInTheDocument();
    expect(screen.getByTitle("إلغاء")).toBeInTheDocument();
  });
});

describe("المصروف الملغى", () => {
  beforeEach(() => {
    expensesQuery.mockReturnValue({
      data: {
        expenses: [
          makeExpense({
            id: "e2",
            status: "CANCELLED",
            cancelReason: "مكرر",
            cancelledById: "u1",
            cancelledBy: { id: "u1", name: "محمد جمال" },
          }),
        ],
        totalAmount: "0",
        meta: { ...PAGE_META, total: 1, totalPages: 1, hasNext: false },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("يبقى ظاهراً في الجدول (لا يُحذف)", () => {
    render(<ExpensesView />);
    expect(screen.getByText("ملغى")).toBeInTheDocument();
  });

  it("لا يعرض له زرّ تعديل ولا إلغاء", () => {
    render(<ExpensesView />);
    expect(screen.queryByTitle("تعديل")).not.toBeInTheDocument();
    expect(screen.queryByTitle("إلغاء")).not.toBeInTheDocument();
    expect(screen.getByTitle("عرض")).toBeInTheDocument();
  });
});

describe("الحالات الفارغة والخطأ", () => {
  it("يعرض حالة فارغة حين لا نتائج", () => {
    expensesQuery.mockReturnValue({
      data: { expenses: [], totalAmount: "0", meta: { ...PAGE_META, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ExpensesView />);
    expect(screen.getByText("لا توجد مصروفات")).toBeInTheDocument();
  });

  it("يعرض حالة خطأ قابلة لإعادة المحاولة", () => {
    expensesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("فشل"),
      refetch: vi.fn(),
    });
    render(<ExpensesView />);
    expect(screen.getByRole("button", { name: /إعادة/ })).toBeInTheDocument();
  });
});
