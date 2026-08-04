import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/constants/config";
import { assertSellingAllowed, isBlockedCreate, LicenseBlockedError } from "@/lib/license-gate";
import { useAuthStore } from "@/store/auth-store";

/**
 * عميل HTTP موحد لكل استدعاءات الـ API المحمية
 * - withCredentials: كوكي الـ Refresh (HttpOnly, SameSite=strict → CSRF Ready)
 * - Access Token يُرفق من الذاكرة (Zustand) - لا تخزين
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/**
 * عميل خام لمسارات refresh/logout - بلا interceptors
 * يمنع حلقات لا نهائية (401 أثناء الـ refresh نفسه)
 */
export const authHttp = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ==================== Request Interceptor ====================

apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Phase 15B: نقطة التحقق الموحّدة للترخيص — تمنع إنشاء البيانات المالية قبل
  // إرسال الطلب. القراءة والتقارير والنسخ الاحتياطي لا تمرّ من هذا الشرط.
  if (isBlockedCreate(config.method, config.url)) {
    await assertSellingAllowed();
  }
  return config;
});

// ==================== 401 + Auto Refresh (Single-flight) ====================

/** طلب refresh واحد مشترك مهما تعددت الـ 401 المتزامنة */
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= useAuthStore
    .getState()
    .refresh()
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/** مسارات لا يُعاد المحاولة عليها (فشلها 401 حقيقي وليس انتهاء توكين) */
const NO_RETRY_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const url = original?.url ?? "";

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      original !== undefined &&
      !original._retry &&
      !NO_RETRY_PATHS.some((p) => url.includes(p));

    if (shouldAttemptRefresh) {
      original._retry = true; // Retry مرة واحدة فقط
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
      // فشل الـ Refresh → الـ store ضبط sessionExpired والـ Guard سيعيد التوجيه
    }

    return Promise.reject(error);
  },
);

// ==================== Error Helper ====================

/** شكل الخطأ الموحد من الـ API */
interface ApiErrorBody {
  success: false;
  message: string;
  errors?: { path: string; message: string }[];
}

/** هل الفشل بسبب تعذّر الوصول للخادم أصلاً (لا استجابة)؟ */
export function isNetworkError(error: unknown): boolean {
  return error instanceof AxiosError && !error.response;
}

/** استخراج رسالة خطأ قابلة للعرض من أي فشل */
export function getErrorMessage(error: unknown): string {
  // منع الترخيص له رسالته الخاصة — لا يُعرض كخطأ عام غامض
  if (error instanceof LicenseBlockedError) return error.message;
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) return body.message;
    if (error.code === "ECONNABORTED") return "انتهت مهلة الطلب. حاول مجدداً";
    if (!error.response) return "تعذر الاتصال بالخادم. تأكد من اتصالك بالشبكة";
  }
  return "حدث خطأ غير متوقع";
}

/**
 * استجابات Blob (PDF/Print/Download/Export) تصل كـBlob حتى عند الفشل -
 * getErrorMessage العام لا يقرأها. مكان مشترك جديد (Phase 5) بدل تكرار هذا
 * المنطق مرة ثالثة - النسخ المحلية بـuse-invoices.ts/use-settings.ts أقدم
 * وتبقى كما هي (خارج نطاق هذه المرحلة)
 */
export async function getBlobErrorMessage(error: unknown): Promise<string> {
  if (error instanceof AxiosError && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // تعذّر التحليل - يُستخدم المسار العام أدناه
    }
  }
  return getErrorMessage(error);
}
