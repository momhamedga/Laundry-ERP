import { create } from "zustand";
import {
  clearLegacyAuthStorage,
  clearSessionHint,
  getRememberFlag,
  hasSessionHint,
  setRememberFlag,
  setSessionHint,
} from "@/lib/session";
import { impersonateUser, stopImpersonationRequest } from "@/services/admin.service";
import {
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
} from "@/services/auth.service";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  /** في الذاكرة فقط - لا يُخزن أبداً (Security) */
  accessToken: string | null;
  isAuthenticated: boolean;
  /** أثناء استعادة الجلسة عند الإقلاع */
  isLoading: boolean;
  /** انتهت الجلسة (فشل الـ Refresh) - يعرض Dialog */
  sessionExpired: boolean;
  /** Phase 9.6c - المدير المنتحِل (المستخدم الأصلي) أثناء جلسة انتحال، وإلا null */
  impersonator: AuthUser | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  /** يجدد الـ Access Token عبر كوكي الـ Refresh - يعيد null عند الفشل */
  refresh: () => Promise<string | null>;
  fetchCurrentUser: () => Promise<void>;
  /** استعادة الجلسة عند فتح التطبيق (مرة واحدة) */
  restoreSession: () => Promise<void>;
  dismissSessionExpired: () => void;
  /** Phase 9.6c - الدخول كمستخدم (يوقف التجديد التلقائي أثناء الانتحال) */
  startImpersonation: (userId: string) => Promise<void>;
  /** العودة لحساب المدير (يجدّد توكينه عبر كوكي الـ Refresh الأصلي) */
  stopImpersonation: () => Promise<void>;
}

// ==================== Proactive Refresh Timer ====================

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/** تجديد استباقي قبل انتهاء الصلاحية بدقيقة - Auto Refresh */
function scheduleRefresh(expiresInSec: number, doRefresh: () => Promise<unknown>): void {
  clearRefreshTimer();
  const delayMs = Math.max(expiresInSec - 60, 30) * 1000;
  refreshTimer = setTimeout(() => void doRefresh(), delayMs);
}

/** منع تكرار الاستعادة (Strict Mode / تعدد الـ Guards) */
let restoreStarted = false;

// ==================== Store ====================

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  sessionExpired: false,
  impersonator: null,

  login: async (email, password, rememberMe) => {
    const result = await loginRequest({ email, password });
    setRememberFlag(rememberMe);
    setSessionHint();
    scheduleRefresh(result.expiresInSec, get().refresh);
    set({
      user: result.user,
      accessToken: result.accessToken,
      isAuthenticated: true,
      sessionExpired: false,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await logoutRequest(); // يبطل كوكي الـ Refresh بالخادم
    } catch {
      // فشل الشبكة لا يمنع الخروج محلياً
    }
    clearRefreshTimer();
    clearSessionHint();
    setRememberFlag(false);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      sessionExpired: false,
      isLoading: false,
    });
  },

  refresh: async () => {
    try {
      const result = await refreshRequest();
      scheduleRefresh(result.expiresInSec, get().refresh);
      set({ accessToken: result.accessToken });
      return result.accessToken;
    } catch {
      const wasAuthenticated = get().isAuthenticated;
      clearRefreshTimer();
      clearSessionHint();
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        sessionExpired: wasAuthenticated, // انتهاء جلسة فعلية فقط - ليس فشل استعادة صامتة
        isLoading: false,
      });
      return null;
    }
  },

  fetchCurrentUser: async () => {
    const user = await meRequest();
    set({ user });
  },

  restoreSession: async () => {
    if (restoreStarted) return;
    restoreStarted = true;
    clearLegacyAuthStorage();

    // لا Remember Me ولا جلسة تبويب نشطة → لا محاولة استعادة
    if (!getRememberFlag() && !hasSessionHint()) {
      set({ isLoading: false });
      return;
    }

    const token = await get().refresh();
    if (!token) return; // refresh ضبط الحالة بالفعل

    try {
      const user = await meRequest();
      setSessionHint();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  dismissSessionExpired: () => set({ sessionExpired: false }),

  startImpersonation: async (userId) => {
    const { accessToken, user } = await impersonateUser(userId);
    // يوقف التجديد التلقائي: كوكي الـ Refresh يخصّ المدير، فتجديده يُنهي الانتحال
    clearRefreshTimer();
    const original = get().user;
    set({
      impersonator: original,
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: null },
    });
  },

  stopImpersonation: async () => {
    try {
      await stopImpersonationRequest();
    } catch {
      // فشل تسجيل الإيقاف لا يمنع العودة محلياً
    }
    set({ impersonator: null });
    // استعادة توكين المدير عبر كوكي الـ Refresh الأصلي (يعيد جدولة التجديد)
    const token = await get().refresh();
    if (token) {
      try {
        const user = await meRequest();
        set({ user });
      } catch {
        // تُترك الحالة كما ضبطها refresh
      }
    }
  },
}));
