"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  KeyRound,
  MoreHorizontal,
  Power,
  PowerOff,
  UserPen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/tables/table-skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types";
import type { User, UserSortField } from "@/types/user";
import { RoleBadge } from "./role-badge";

interface UsersTableProps {
  users: readonly User[];
  isLoading: boolean;
  sortBy: UserSortField;
  sortOrder: SortOrder;
  onSort: (field: UserSortField) => void;
  onViewDetails: (user: User) => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onActivate: (user: User) => void;
  onDeactivate: (user: User) => void;
}

const SORTABLE_COLUMNS: { field: UserSortField; label: string }[] = [
  { field: "name", label: "الاسم" },
  { field: "email", label: "البريد الإلكتروني" },
  { field: "role", label: "الدور" },
];

function SortIcon({ active, direction }: { active: boolean; direction: SortOrder }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden />
  );
}

export function UsersTable({
  users,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onViewDetails,
  onEdit,
  onResetPassword,
  onActivate,
  onDeactivate,
}: UsersTableProps) {
  const { can } = usePermissions();
  const canManage = can("users:manage");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {SORTABLE_COLUMNS.map((col) => (
            <TableHead key={col.field} className="text-start">
              <button
                type="button"
                onClick={() => onSort(col.field)}
                className="flex items-center gap-1 hover:text-primary"
              >
                {col.label}
                <SortIcon active={sortBy === col.field} direction={sortOrder} />
              </button>
            </TableHead>
          ))}
          <TableHead className="text-start">الهاتف</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <TableHead className="text-start">
            <button
              type="button"
              onClick={() => onSort("createdAt")}
              className="flex items-center gap-1 hover:text-primary"
            >
              تاريخ الإنشاء
              <SortIcon active={sortBy === "createdAt"} direction={sortOrder} />
            </button>
          </TableHead>
          <TableHead className="w-10 text-start">
            <span className="sr-only">إجراءات</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeletonRows rows={8} columns={7} />
        ) : (
          users.map((user) => (
            <TableRow key={user.id} className={cn(!user.isActive && "opacity-60")}>
              <TableCell className="font-medium">
                <button
                  type="button"
                  onClick={() => onViewDetails(user)}
                  className="hover:text-primary hover:underline"
                >
                  {user.name}
                </button>
              </TableCell>
              <TableCell dir="ltr" className="text-start text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell dir="ltr" className="text-start text-muted-foreground">
                {user.phone ?? "—"}
              </TableCell>
              <TableCell>
                <CustomerStatusBadge isActive={user.isActive} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label={`إجراءات ${user.name}`}>
                        <MoreHorizontal aria-hidden />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(user)}>
                      <Eye aria-hidden /> عرض التفاصيل
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <UserPen aria-hidden /> تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResetPassword(user)}>
                          <KeyRound aria-hidden /> إعادة تعيين كلمة السر
                        </DropdownMenuItem>
                        {user.isActive ? (
                          <DropdownMenuItem variant="destructive" onClick={() => onDeactivate(user)}>
                            <PowerOff aria-hidden /> تعطيل
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onActivate(user)}>
                            <Power aria-hidden /> تفعيل
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
