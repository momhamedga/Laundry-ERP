"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/tables/table-skeleton";
import type { SessionInfo } from "@/types/session";
import { SessionRow } from "./session-row";

interface SessionsTableProps {
  sessions: readonly SessionInfo[];
  isLoading: boolean;
  onLogoutCurrent: () => void;
  onLogoutSession: (session: SessionInfo) => void;
}

export function SessionsTable({
  sessions,
  isLoading,
  onLogoutCurrent,
  onLogoutSession,
}: SessionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">الجهاز والمتصفح</TableHead>
          <TableHead className="text-start">عنوان IP</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <TableHead className="text-start">بدأت في</TableHead>
          <TableHead className="text-start">صالحة حتى</TableHead>
          <TableHead className="text-start">
            <span className="sr-only">الجلسة الحالية</span>
          </TableHead>
          <TableHead className="text-start">
            <span className="sr-only">إجراءات</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeletonRows rows={3} columns={7} />
        ) : (
          sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onLogoutCurrent={onLogoutCurrent}
              onLogoutSession={onLogoutSession}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
