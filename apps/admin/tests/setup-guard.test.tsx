import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * حراسة التهيئة والتوجيه.
 *
 * أخطر ما في هذه المرحلة حلقة توجيه: حارس اللوحة يدفع إلى /setup، وصفحة /setup
 * تدفع إلى اللوحة، فيدور المستخدم بلا نهاية. الاختبارات هنا تثبت أن الطرفين لا
 * يوجّهان في الحالة نفسها أبداً — وهو الشرط الذي يمنع الحلقة بنيوياً.
 */
const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));

const status = {
  isLoading: false,
  needsSetup: false,
  canRunSetup: false,
  isUnknown: false,
};

vi.mock("@/hooks/use-setup-status", () => ({
  useSetupStatus: () => status,
}));

vi.mock("@/hooks/use-branches", () => ({
  useActiveBranchesQuery: () => ({ data: [], isPending: false, isError: false }),
}));

// المعالج نفسه خارج نطاق هذه السويت — تُختبر البوابة لا محتواها
vi.mock("@/components/setup/setup-wizard", () => ({
  SetupWizard: () => <div data-testid="wizard">المعالج</div>,
}));

const { SetupGuard } = await import("@/components/layout/setup-guard");
const { SetupView } = await import("@/components/setup/setup-view");

function setStatus(next: Partial<typeof status>) {
  Object.assign(status, {
    isLoading: false,
    needsSetup: false,
    canRunSetup: false,
    isUnknown: false,
    ...next,
  });
}

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  setStatus({});
});

describe("SetupGuard — حارس اللوحة", () => {
  it("نظام غير مهيّأ ⇒ توجيه إلى /setup ولا يُعرض المحتوى", () => {
    setStatus({ needsSetup: true });
    render(
      <SetupGuard>
        <div data-testid="dashboard">اللوحة</div>
      </SetupGuard>,
    );

    expect(replace).toHaveBeenCalledWith("/setup");
    expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
  });

  it("نظام مهيّأ ⇒ يُعرض المحتوى بلا أي توجيه", () => {
    setStatus({ needsSetup: false });
    render(
      <SetupGuard>
        <div data-testid="dashboard">اللوحة</div>
      </SetupGuard>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("أثناء التحميل: لا توجيه ولا محتوى — لا قرار على حالة غير محسومة", () => {
    setStatus({ isLoading: true });
    render(
      <SetupGuard>
        <div data-testid="dashboard">اللوحة</div>
      </SetupGuard>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
  });

  it("تعذّر تحديد الحالة لا يحبس المستخدم خارج اللوحة", () => {
    setStatus({ isUnknown: true, needsSetup: false });
    render(
      <SetupGuard>
        <div data-testid="dashboard">اللوحة</div>
      </SetupGuard>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });
});

describe("SetupView — صفحة /setup", () => {
  it("مستخدم مخوَّل ونظام غير مهيّأ ⇒ يظهر المعالج بلا توجيه", () => {
    setStatus({ needsSetup: true, canRunSetup: true });
    render(<SetupView />);

    expect(screen.getByTestId("wizard")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("مستخدم غير مخوَّل ⇒ رسالة صريحة بلا معالج وبلا توجيه (وإلا نشأت حلقة)", () => {
    setStatus({ needsSetup: true, canRunSetup: false });
    render(<SetupView />);

    expect(screen.queryByTestId("wizard")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText(/تتطلّب حساب مدير النظام/)).toBeInTheDocument();
  });

  it("نظام مهيّأ ⇒ توجيه للوحة ولا يُعرض المعالج", () => {
    setStatus({ needsSetup: false, canRunSetup: true });
    render(<SetupView />);

    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.queryByTestId("wizard")).not.toBeInTheDocument();
  });

  it("تعذّر تحديد الحالة ⇒ رسالة انتظار لا معالج (تفادياً لفرع مكرّر)", () => {
    setStatus({ isUnknown: true, canRunSetup: true });
    render(<SetupView />);

    expect(screen.queryByTestId("wizard")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText(/تعذّر التحقّق من حالة النظام/)).toBeInTheDocument();
  });

  /**
   * الحلقة تنشأ لو وجّه الطرفان في الحالة نفسها. هذا الاختبار يفحص الحالتين
   * الوحيدتين اللتين يوجّه فيهما أحدهما، ويثبت أن الآخر ساكن فيهما.
   */
  it("لا حلقة توجيه: الحارس والصفحة لا يوجّهان في الحالة نفسها أبداً", () => {
    // (أ) غير مهيّأ: الحارس يوجّه، والصفحة ساكنة
    setStatus({ needsSetup: true, canRunSetup: true });
    const guard = render(
      <SetupGuard>
        <div />
      </SetupGuard>,
    );
    const guardRedirects = replace.mock.calls.map(([to]) => to);
    guard.unmount();
    replace.mockClear();

    render(<SetupView />);
    const viewRedirectsWhenNeeded = replace.mock.calls.length;
    replace.mockClear();

    expect(guardRedirects).toEqual(["/setup"]);
    expect(viewRedirectsWhenNeeded).toBe(0);

    // (ب) مهيّأ: الصفحة توجّه، والحارس ساكن
    setStatus({ needsSetup: false, canRunSetup: true });
    render(<SetupView />);
    const viewRedirects = replace.mock.calls.map(([to]) => to);
    replace.mockClear();

    render(
      <SetupGuard>
        <div />
      </SetupGuard>,
    );
    expect(viewRedirects).toEqual(["/"]);
    expect(replace).not.toHaveBeenCalled();
  });
});
