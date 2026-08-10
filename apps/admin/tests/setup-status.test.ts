import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "@/constants/permissions";

/**
 * منطق اكتشاف حالة التهيئة.
 *
 * العطل الذي يمنعه: يمكن أن يقلع النظام بلا فرع، فيصل الموظّف إلى معالج إنشاء
 * الطلب ويملأه كاملاً ثم يفشل عند الحفظ برسالة غامضة. هذه الاختبارات تثبت أن
 * الحالة تُقرأ صحيحةً، وأن خطأ الشبكة **لا** يُقرأ كـ«غير مهيّأ» — إذ سيحبس
 * ذلك مستخدماً في نظام مهيّأ داخل معالجٍ لا يحتاجه وربما يدفعه لإنشاء فرع ثانٍ.
 */
const branchesState = {
  data: undefined as { id: string; name: string }[] | undefined,
  isPending: true,
  isError: false,
};
let currentPermissions: readonly Permission[] = [];

vi.mock("@/hooks/use-branches", () => ({
  useActiveBranchesQuery: () => branchesState,
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    role: undefined,
    can: (p: Permission) => currentPermissions.includes(p),
    hasRole: () => false,
  }),
}));

const { useSetupStatus } = await import("@/hooks/use-setup-status");

const ADMIN_PERMS = ["branches:manage", "services:manage", "users:manage"] as Permission[];

function setBranches(data: { id: string; name: string }[] | undefined, opts?: Partial<typeof branchesState>) {
  branchesState.data = data;
  branchesState.isPending = opts?.isPending ?? false;
  branchesState.isError = opts?.isError ?? false;
}

beforeEach(() => {
  currentPermissions = [];
  setBranches(undefined, { isPending: true });
});

describe("اكتشاف حالة التهيئة", () => {
  it("قاعدة فارغة بلا فروع ⇒ النظام غير مهيّأ", () => {
    setBranches([]);
    const { result } = renderHook(() => useSetupStatus());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.needsSetup).toBe(true);
  });

  it("وجود فرع نشط ⇒ النظام مهيّأ", () => {
    setBranches([{ id: "b1", name: "الفرع الرئيسي" }]);
    const { result } = renderHook(() => useSetupStatus());

    expect(result.current.needsSetup).toBe(false);
  });

  it("أثناء التحميل لا يُتّخذ أي قرار توجيه", () => {
    setBranches(undefined, { isPending: true });
    const { result } = renderHook(() => useSetupStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.needsSetup).toBe(false);
  });

  it("خطأ الجلب لا يُقرأ كـ«غير مهيّأ»", () => {
    setBranches(undefined, { isError: true });
    const { result } = renderHook(() => useSetupStatus());

    expect(result.current.isUnknown).toBe(true);
    expect(result.current.needsSetup).toBe(false);
  });

  it("المدير وحده يملك إتمام التهيئة (الصلاحيات الثلاث)", () => {
    setBranches([]);
    currentPermissions = ADMIN_PERMS;
    const { result } = renderHook(() => useSetupStatus());

    expect(result.current.canRunSetup).toBe(true);
  });

  it("صلاحية واحدة ناقصة تكفي لمنع إتمام التهيئة", () => {
    setBranches([]);
    // مدير الفرع يملك services:manage وحدها
    currentPermissions = ["services:manage"] as Permission[];
    const { result } = renderHook(() => useSetupStatus());

    expect(result.current.canRunSetup).toBe(false);
    expect(result.current.needsSetup).toBe(true);
  });

  it("مستخدم بلا صلاحيات: النظام غير مهيّأ لكنه لا يستطيع تهيئته", () => {
    setBranches([]);
    currentPermissions = [];
    const { result } = renderHook(() => useSetupStatus());

    expect(result.current.needsSetup).toBe(true);
    expect(result.current.canRunSetup).toBe(false);
  });
});
