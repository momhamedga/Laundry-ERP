"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useLogout, useSessionsQuery } from "@/hooks/use-auth";
import { getErrorMessage } from "@/lib/axios";
import type { SessionInfo } from "@/types/session";
import { LogoutAllSessionsDialog } from "./logout-all-sessions-dialog";
import { LogoutSessionDialog } from "./logout-session-dialog";
import { SessionsCard } from "./sessions-card";
import { SessionsEmptyState } from "./sessions-empty-state";
import { SessionsErrorState } from "./sessions-error-state";
import { SessionsSkeleton } from "./sessions-skeleton";
import { SessionsTable } from "./sessions-table";
import { SessionsToolbar } from "./sessions-toolbar";

/** جسم صفحة الجلسات النشطة - GET/DELETE /auth/sessions + POST /auth/logout الموجود (للجلسة الحالية) */
export function SessionsView() {
  const { data: sessions, isLoading, isError, error, refetch } = useSessionsQuery();
  const logout = useLogout();

  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);

  if (isLoading) return <SessionsSkeleton />;
  if (isError) {
    return <SessionsErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const list = sessions ?? [];
  const otherSessions = list.filter((s) => !s.current);

  return (
    <div className="space-y-6">
      <PageHeader
        title="الجلسات النشطة"
        description="الأجهزة المسجَّل بها دخول حالياً على حسابك"
      />

      <SessionsCard>
        {list.length === 0 ? (
          <SessionsEmptyState />
        ) : (
          <>
            <SessionsToolbar
              totalCount={list.length}
              otherCount={otherSessions.length}
              onLogoutAllOthers={() => setLogoutAllOpen(true)}
            />
            <SessionsTable
              sessions={list}
              isLoading={false}
              onLogoutCurrent={() => void logout()}
              onLogoutSession={setRevokeTarget}
            />
          </>
        )}
      </SessionsCard>

      <LogoutSessionDialog
        session={revokeTarget}
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      />
      <LogoutAllSessionsDialog
        otherSessions={otherSessions}
        open={logoutAllOpen}
        onOpenChange={setLogoutAllOpen}
      />
    </div>
  );
}
