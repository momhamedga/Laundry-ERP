"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useRemoveOverrideMutation,
  useSetOverrideMutation,
  useUserPermissionsQuery,
} from "@/hooks/use-admin";
import { useUsersQuery } from "@/hooks/use-users";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_LABELS } from "./admin-format";

export function UserPermissionsTab() {
  const { can } = usePermissions();
  const canManage = can("security:manage");
  const usersQuery = useUsersQuery({ limit: 100 });
  const [userId, setUserId] = useState("");
  const perms = useUserPermissionsQuery(userId || null);
  const setOverride = useSetOverrideMutation(userId);
  const removeOverride = useRemoveOverrideMutation(userId);
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [impersonating, setImpersonating] = useState(false);

  const data = perms.data;
  const effective = new Set(data?.effective ?? []);
  const rolePerms = new Set(data?.rolePermissions ?? []);
  const overrideMap = new Map((data?.overrides ?? []).map((o) => [o.permission, o.granted]));

  function toggle(permission: string) {
    if (!canManage) return;
    const inRole = rolePerms.has(permission);
    const next = !effective.has(permission);
    if (inRole) {
      if (next) removeOverride.mutate(permission);
      else setOverride.mutate({ permission, granted: false });
    } else {
      if (next) setOverride.mutate({ permission, granted: true });
      else removeOverride.mutate(permission);
    }
  }

  async function loginAs() {
    if (!userId) return;
    setImpersonating(true);
    try {
      await startImpersonation(userId);
      toast.success("تم الدخول كمستخدم");
    } catch {
      toast.error("تعذّر الدخول كمستخدم");
    } finally {
      setImpersonating(false);
    }
  }

  const selectedUser = usersQuery.data?.users.find((u) => u.id === userId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={userId} onValueChange={(v) => v && setUserId(v)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="اختر مستخدماً" />
          </SelectTrigger>
          <SelectContent>
            {(usersQuery.data?.users ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name} — {ROLE_LABELS[u.role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && selectedUser && selectedUser.role !== "ADMIN" && (
          <Button variant="outline" size="sm" disabled={impersonating} onClick={() => void loginAs()}>
            <LogIn aria-hidden />
            الدخول كهذا المستخدم
          </Button>
        )}
      </div>

      {!userId ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          اختر مستخدماً لعرض وتحرير صلاحياته الفعلية (الدور + التجاوزات).
        </p>
      ) : perms.isLoading || !data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">الدور:</span>
            <Badge>{ROLE_LABELS[data.role]}</Badge>
            <span className="text-muted-foreground">
              — {data.effective.length} صلاحية فعّالة، {data.overrides.length} تجاوز
            </span>
          </div>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-1 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSIONS.map((perm) => {
                const isEffective = effective.has(perm);
                const overridden = overrideMap.has(perm);
                return (
                  <label
                    key={perm}
                    className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs" dir="ltr">
                        {perm}
                      </span>
                      {overridden && (
                        <Badge variant="outline" className="text-[0.65rem]">
                          {overrideMap.get(perm) ? "ممنوح" : "مسحوب"}
                        </Badge>
                      )}
                    </span>
                    <Switch
                      checked={isEffective}
                      disabled={!canManage || setOverride.isPending || removeOverride.isPending}
                      onCheckedChange={() => toggle(perm)}
                    />
                  </label>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
