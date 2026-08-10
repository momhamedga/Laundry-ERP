import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * خطوة الخدمات.
 *
 * تركّز على قاعدتَي عمل قائمتَين في المخطّط لا على الشكل:
 *  - `Service.categoryId` غير اختياري (onDelete: Restrict) ⇒ لا خدمة بلا تصنيف.
 *  - المتابعة تتطلّب خدمة واحدة على الأقل ⇒ نظامٌ بلا خدمات لا يُنشئ طلباً.
 * ومنعُ الحالة المستحيلة في الواجهة أوضح للمستخدم من رسالة رفض من الخادم.
 */
const createCategory = vi.fn();
const createService = vi.fn();
const categoriesState = {
  data: { categories: [] as { id: string; name: string }[] },
  isPending: false,
};
const serviceMutation = { mutateAsync: createService, isPending: false, isError: false, error: null };

vi.mock("@/hooks/use-service-categories", () => ({
  useAllCategoriesQuery: () => categoriesState,
  useCreateCategoryMutation: () => ({
    mutateAsync: createCategory,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-services", () => ({
  useCreateServiceMutation: () => serviceMutation,
}));

const { SetupServicesStep } = await import("@/components/setup/setup-services-step");

function renderStep(services: { id: string; name: string; price: number; unit: "PIECE" }[] = []) {
  const onNext = vi.fn();
  const onBack = vi.fn();
  const onServiceCreated = vi.fn();
  render(
    <SetupServicesStep
      services={services}
      onServiceCreated={onServiceCreated}
      onBack={onBack}
      onNext={onNext}
    />,
  );
  return { onNext, onBack, onServiceCreated };
}

beforeEach(() => {
  createCategory.mockReset();
  createService.mockReset();
  categoriesState.data = { categories: [] };
  serviceMutation.isError = false;
  serviceMutation.error = null;
});

describe("خطوة الخدمات", () => {
  it("بلا تصنيف: نموذج الخدمة معطَّل ويُشرح السبب", () => {
    renderStep();
    expect(screen.getByText(/أضِف تصنيفاً أولاً/)).toBeInTheDocument();
    expect(screen.getByLabelText(/اسم الخدمة/)).toBeDisabled();
  });

  it("إنشاء تصنيف يمرّ على الطفرة القائمة بالقيم الصحيحة", async () => {
    const user = userEvent.setup();
    createCategory.mockResolvedValue({ id: "c1", name: "غسيل" });
    renderStep();

    await user.type(screen.getByLabelText("اسم التصنيف"), "غسيل");
    await user.click(screen.getByRole("button", { name: /إضافة$/ }));

    expect(createCategory).toHaveBeenCalledWith({ name: "غسيل", sortOrder: 0 });
  });

  it("مع وجود تصنيف: نموذج الخدمة مفعَّل", () => {
    categoriesState.data = { categories: [{ id: "c1", name: "غسيل" }] };
    renderStep();
    expect(screen.getByLabelText(/اسم الخدمة/)).not.toBeDisabled();
  });

  it("المتابعة ممنوعة بلا خدمة واحدة على الأقل", () => {
    categoriesState.data = { categories: [{ id: "c1", name: "غسيل" }] };
    renderStep([]);

    expect(screen.getByRole("button", { name: /المتابعة/ })).toBeDisabled();
    expect(screen.getByText(/أضِف خدمة واحدة على الأقل/)).toBeInTheDocument();
  });

  it("بعد إضافة خدمة تُتاح المتابعة وتُعرَض الخدمة", async () => {
    const user = userEvent.setup();
    categoriesState.data = { categories: [{ id: "c1", name: "غسيل" }] };
    const { onNext } = renderStep([{ id: "s1", name: "غسيل قميص", price: 25, unit: "PIECE" }]);

    expect(screen.getByText("غسيل قميص")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: /المتابعة/ });
    expect(next).not.toBeDisabled();

    await user.click(next);
    expect(onNext).toHaveBeenCalled();
  });

  it("فشل إنشاء الخدمة يظهر برسالة عربية داخل الخطوة", () => {
    categoriesState.data = { categories: [{ id: "c1", name: "غسيل" }] };
    serviceMutation.isError = true;
    serviceMutation.error = { message: "فشل" } as never;
    renderStep();

    expect(screen.getByText("تعذّر إنشاء الخدمة")).toBeInTheDocument();
  });
});
