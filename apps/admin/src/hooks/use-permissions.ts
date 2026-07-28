"use client";

import { hasAnyRole, hasPermission, type Permission } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types";

/** صلاحيات المستخدم الحالي - لإخفاء/إظهار الأزرار حسب الدور القادم من الخادم */
export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);

  return {
    role,
    can: (permission: Permission) => hasPermission(role, permission),
    hasRole: (...roles: readonly UserRole[]) => hasAnyRole(role, ...roles),
  };
}
