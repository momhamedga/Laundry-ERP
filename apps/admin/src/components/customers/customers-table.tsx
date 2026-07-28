"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  UserPen,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import type { Customer, CustomerSortField } from "@/types/customer";
import { CustomerStatusBadge } from "./customer-status-badge";

interface CustomersTableProps {
  customers: readonly Customer[];
  isLoading: boolean;
  sortBy: CustomerSortField;
  sortOrder: SortOrder;
  onSort: (field: CustomerSortField) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRestore: (customer: Customer) => void;
}

const SORTABLE_COLUMNS: { field: CustomerSortField; label: string }[] = [
  { field: "name", label: "الاسم" },
  { field: "phone", label: "الهاتف" },
];

function SortIcon({ active, direction }: { active: boolean; direction: SortOrder }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden />
  );
}

export function CustomersTable({
  customers,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onRestore,
}: CustomersTableProps) {
  const { can, hasRole } = usePermissions();
  const canManage = can("customers:manage");
  const canDeleteRestore = hasRole("ADMIN", "MANAGER");

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
          <TableHead className="text-start">البريد الإلكتروني</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <TableHead className="text-start">
            <button
              type="button"
              onClick={() => onSort("createdAt")}
              className="flex items-center gap-1 hover:text-primary"
            >
              تاريخ التسجيل
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
          <TableSkeletonRows rows={8} columns={6} />
        ) : (
          customers.map((customer) => (
            <TableRow key={customer.id} className={cn(!customer.isActive && "opacity-60")}>
              <TableCell className="font-medium">
                <Link href={`/customers/${customer.id}`} className="hover:text-primary hover:underline">
                  {customer.name}
                </Link>
              </TableCell>
              <TableCell dir="ltr" className="text-start">
                {customer.phone}
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
              <TableCell>
                <CustomerStatusBadge isActive={customer.isActive} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(customer.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label="إجراءات">
                        <MoreHorizontal aria-hidden />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/customers/${customer.id}`} />}>
                      <Eye aria-hidden /> عرض التفاصيل
                    </DropdownMenuItem>
                    {canManage && (
                      <DropdownMenuItem onClick={() => onEdit(customer)}>
                        <UserPen aria-hidden /> تعديل
                      </DropdownMenuItem>
                    )}
                    {canDeleteRestore &&
                      (customer.isActive ? (
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(customer)}>
                          <Trash2 aria-hidden /> تعطيل
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onRestore(customer)}>
                          <RotateCcw aria-hidden /> استعادة
                        </DropdownMenuItem>
                      ))}
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
