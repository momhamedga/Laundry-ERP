"use client";

import { Check, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissionMatrixQuery } from "@/hooks/use-admin";
import { getErrorMessage } from "@/lib/axios";
import { ROLE_LABELS } from "./admin-format";

export function PermissionsMatrixTab() {
  const query = usePermissionMatrixQuery();

  if (query.isError) {
    return (
      <ErrorState
        title="تعذر تحميل مصفوفة الصلاحيات"
        description={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isLoading || !query.data) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const { permissions, roles, matrix } = query.data;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        عرض للقراءة فقط لخريطة الصلاحيات المطبَّقة في النظام حسب الدور. (مدير النظام يملك كل الصلاحيات ضمنياً.)
      </p>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky start-0 bg-card">الصلاحية</TableHead>
                {roles.map((role) => (
                  <TableHead key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm}>
                  <TableCell className="sticky start-0 bg-card font-mono text-xs" dir="ltr">
                    {perm}
                  </TableCell>
                  {roles.map((role) => {
                    const has = matrix[role]?.includes(perm);
                    return (
                      <TableCell key={role} className="text-center">
                        {has ? (
                          <Check className="mx-auto size-4 text-success" aria-label="نعم" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="لا" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
