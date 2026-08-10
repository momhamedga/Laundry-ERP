import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * تدفّق معالج التهيئة.
 *
 * يُختبر الانتقال بين الخطوات فعلياً بنقرات مستخدم لا باستدعاء دوال داخلية:
 * العطل الذي وُجد المعالج لمنعه ظهر أصلاً في تدفّق واجهة سليم الأنواع تماماً،
 * فمرور TypeScript وحده لا يثبت شيئاً هنا.
 */
const createBranch = vi.fn();
const createUser = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/hooks/use-branches", () => ({
  useCreateBranchMutation: () => ({
    mutateAsync: createBranch,
    isPending: false,
    isError: false,
    error: null,
  }),
  useActiveBranchesQuery: () => ({ data: [], isPending: false, isError: false }),
}));

vi.mock("@/hooks/use-users", () => ({
  useCreateUserMutation: () => ({
    mutateAsync: createUser,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

// خطوة الخدمات لها سويت منفصلة — هنا يهمّ الانتقال إليها ومنها
vi.mock("@/components/setup/setup-services-step", () => ({
  SetupServicesStep: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
    <div>
      <span data-testid="services-step">خطوة الخدمات</span>
      <button type="button" onClick={onBack}>
        رجوع من الخدمات
      </button>
      <button type="button" onClick={onNext}>
        متابعة من الخدمات
      </button>
    </div>
  ),
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: "u1", name: "المدير", role: "ADMIN" } }),
}));

const { SetupWizard } = await import("@/components/setup/setup-wizard");

beforeEach(() => {
  createBranch.mockReset();
  createUser.mockReset();
  replace.mockClear();
});

describe("معالج التهيئة — التدفّق", () => {
  it("يبدأ من خطوة الفرع حين لا يوجد فرع", () => {
    render(<SetupWizard initialBranch={null} />);
    expect(screen.getByLabelText(/اسم الفرع/)).toBeInTheDocument();
  });

  it("إنشاء فرع ينقل إلى خطوة الخدمات", async () => {
    const user = userEvent.setup();
    createBranch.mockResolvedValue({ id: "b1", name: "الفرع الرئيسي" });

    render(<SetupWizard initialBranch={null} />);
    await user.type(screen.getByLabelText(/اسم الفرع/), "الفرع الرئيسي");
    await user.click(screen.getByRole("button", { name: /حفظ الفرع/ }));

    expect(createBranch).toHaveBeenCalledWith({
      name: "الفرع الرئيسي",
      address: null,
      phone: null,
    });
    expect(await screen.findByTestId("services-step")).toBeInTheDocument();
  });

  it("اسم فرع قصير يُرفَض قبل أي نداء شبكة", async () => {
    const user = userEvent.setup();
    render(<SetupWizard initialBranch={null} />);

    await user.type(screen.getByLabelText(/اسم الفرع/), "ا");
    await user.click(screen.getByRole("button", { name: /حفظ الفرع/ }));

    expect(createBranch).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("فرعٌ موجود مسبقاً يستأنف من خطوة الخدمات — استئناف بعد تحديث الصفحة", () => {
    render(<SetupWizard initialBranch={{ id: "b1", name: "الفرع الرئيسي" }} />);
    expect(screen.getByTestId("services-step")).toBeInTheDocument();
  });

  it("الرجوع من الخدمات يعيد إلى خطوة الفرع", async () => {
    const user = userEvent.setup();
    render(<SetupWizard initialBranch={{ id: "b1", name: "الفرع الرئيسي" }} />);

    await user.click(screen.getByRole("button", { name: /رجوع من الخدمات/ }));
    expect(screen.getByLabelText(/اسم الفرع/)).toBeInTheDocument();
  });

  it("تخطّي المستخدمين مسموح — النظام يعمل بحساب المدير وحده", async () => {
    const user = userEvent.setup();
    render(<SetupWizard initialBranch={{ id: "b1", name: "الفرع الرئيسي" }} />);

    await user.click(screen.getByRole("button", { name: /متابعة من الخدمات/ }));
    await user.click(screen.getByRole("button", { name: /تخطّي والمتابعة/ }));

    expect(screen.getByText("النظام جاهز للاستخدام")).toBeInTheDocument();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("الخطوة الأخيرة تعرض ملخّصاً ثم تنقل للوحة", async () => {
    const user = userEvent.setup();
    render(<SetupWizard initialBranch={{ id: "b1", name: "الفرع الرئيسي" }} />);

    await user.click(screen.getByRole("button", { name: /متابعة من الخدمات/ }));
    await user.click(screen.getByRole("button", { name: /تخطّي والمتابعة/ }));

    expect(screen.getByText("الفرع الرئيسي")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /الذهاب إلى لوحة التحكم/ }));

    // replace لا push: زرّ الرجوع يجب ألّا يعيد المستخدم لمعالج اكتمل
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("مؤشّر التقدّم يعلن الخطوة الحالية لقارئ الشاشة", () => {
    render(<SetupWizard initialBranch={null} />);
    expect(screen.getByText(/الخطوة 1 من 4/)).toBeInTheDocument();
  });
});
