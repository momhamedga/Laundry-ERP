"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
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
import type { Branch, BranchSortField } from "@/types/branch";

interface BranchesTableProps {
  branches: readonly Branch[];
  isLoading: boolean;
  sortBy: BranchSortField;
  sortOrder: SortOrder;
  onSort: (field: BranchSortField) => void;
  onViewDetails: (branch: Branch) => void;
  onEdit: (branch: Branch) => void;
  onActivate: (branch: Branch) => void;
  onDeactivate: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortOrder }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden />
  );
}

export function BranchesTable({
  branches,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onViewDetails,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}: BranchesTableProps) {
  const { can } = usePermissions();
  const canManage = can("branches:manage");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">
            <button
              type="button"
              onClick={() => onSort("name")}
              className="flex items-center gap-1 hover:text-primary"
            >
              الاسم
              <SortIcon active={sortBy === "name"} direction={sortOrder} />
            </button>
          </TableHead>
          <TableHead className="text-start">العنوان</TableHead>
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
          <TableSkeletonRows rows={8} columns={6} />
        ) : (
          branches.map((branch) => (
            <TableRow key={branch.id} className={cn(!branch.isActive && "opacity-60")}>
              <TableCell className="font-medium">
                <button
                  type="button"
                  onClick={() => onViewDetails(branch)}
                  className="hover:text-primary hover:underline"
                >
                  {branch.name}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">{branch.address ?? "—"}</TableCell>
              <TableCell dir="ltr" className="text-start text-muted-foreground">
                {branch.phone ?? "—"}
              </TableCell>
              <TableCell>
                <CustomerStatusBadge isActive={branch.isActive} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(branch.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`إجراءات ${branch.name}`}
                      >
                        <MoreHorizontal aria-hidden />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(branch)}>
                      <Eye aria-hidden /> عرض التفاصيل
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(branch)}>
                          <Pencil aria-hidden /> تعديل
                        </DropdownMenuItem>
                        {branch.isActive ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDeactivate(branch)}
                          >
                            <PowerOff aria-hidden /> تعطيل
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onActivate(branch)}>
                            <Power aria-hidden /> تفعيل
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(branch)}>
                          <Trash2 aria-hidden /> حذف
                        </DropdownMenuItem>
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
