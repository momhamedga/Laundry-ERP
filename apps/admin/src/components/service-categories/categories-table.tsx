"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
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
import { useChangeCategoryStatusMutation } from "@/hooks/use-service-categories";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types";
import type { CategorySortField, CategoryWithCount } from "@/types/service-category";
import { CategoryStatusBadge } from "./category-status-badge";

interface CategoriesTableProps {
  categories: readonly CategoryWithCount[];
  isLoading: boolean;
  sortBy: CategorySortField;
  sortOrder: SortOrder;
  onSort: (field: CategorySortField) => void;
  onEdit: (category: CategoryWithCount) => void;
  onDisable: (category: CategoryWithCount) => void;
  onDelete: (category: CategoryWithCount) => void;
}

const SORTABLE_COLUMNS: { field: CategorySortField; label: string }[] = [
  { field: "sortOrder", label: "الترتيب" },
  { field: "name", label: "الاسم" },
];

function SortIcon({ active, direction }: { active: boolean; direction: SortOrder }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden />
  );
}

export function CategoriesTable({
  categories,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDisable,
  onDelete,
}: CategoriesTableProps) {
  const { can } = usePermissions();
  const canManage = can("services:manage");
  const enableMutation = useChangeCategoryStatusMutation();

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
          <TableHead className="text-start">عدد الخدمات</TableHead>
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
          <TableSkeletonRows rows={6} columns={6} />
        ) : (
          categories.map((category) => (
            <TableRow key={category.id} className={cn(!category.isActive && "opacity-60")}>
              <TableCell className="tabular-nums text-muted-foreground">
                {category.sortOrder}
              </TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-muted-foreground">{category.servicesCount}</TableCell>
              <TableCell>
                <CategoryStatusBadge isActive={category.isActive} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(category.createdAt)}
              </TableCell>
              <TableCell>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label="إجراءات">
                          <MoreHorizontal aria-hidden />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(category)}>
                        <Pencil aria-hidden /> تعديل
                      </DropdownMenuItem>
                      {category.isActive ? (
                        <DropdownMenuItem onClick={() => onDisable(category)}>
                          <PowerOff aria-hidden /> تعطيل
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            enableMutation.mutate({ id: category.id, isActive: true })
                          }
                        >
                          <Power aria-hidden /> تفعيل
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={category.servicesCount > 0}
                        onClick={() => onDelete(category)}
                      >
                        <Trash2 aria-hidden /> حذف نهائي
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
