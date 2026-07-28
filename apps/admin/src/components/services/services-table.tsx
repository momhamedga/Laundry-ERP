"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types";
import type { Service, ServiceSortField } from "@/types/service";
import { ServiceStatusBadge } from "./service-status-badge";
import { UnitBadge } from "./unit-badge";

interface ServicesTableProps {
  services: readonly Service[];
  isLoading: boolean;
  sortBy: ServiceSortField;
  sortOrder: SortOrder;
  onSort: (field: ServiceSortField) => void;
  onViewDetails: (service: Service) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onRestore: (service: Service) => void;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortOrder }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden />
  );
}

export function ServicesTable({
  services,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onViewDetails,
  onEdit,
  onDelete,
  onRestore,
}: ServicesTableProps) {
  const { can } = usePermissions();
  const canManage = can("services:manage");

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
          <TableHead className="text-start">التصنيف</TableHead>
          <TableHead className="text-start">النوع</TableHead>
          <TableHead className="text-start">
            <button
              type="button"
              onClick={() => onSort("price")}
              className="flex items-center gap-1 hover:text-primary"
            >
              السعر
              <SortIcon active={sortBy === "price"} direction={sortOrder} />
            </button>
          </TableHead>
          <TableHead className="text-start">المدة</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <TableHead className="text-start">
            <button
              type="button"
              onClick={() => onSort("sortOrder")}
              className="flex items-center gap-1 hover:text-primary"
            >
              الترتيب
              <SortIcon active={sortBy === "sortOrder"} direction={sortOrder} />
            </button>
          </TableHead>
          <TableHead className="w-10 text-start">
            <span className="sr-only">إجراءات</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeletonRows rows={8} columns={8} />
        ) : (
          services.map((service) => (
            <TableRow key={service.id} className={cn(!service.isActive && "opacity-60")}>
              <TableCell className="font-medium">
                <button
                  type="button"
                  onClick={() => onViewDetails(service)}
                  className="hover:text-primary hover:underline"
                >
                  {service.name}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">{service.category.name}</TableCell>
              <TableCell>
                <UnitBadge unit={service.unit} />
              </TableCell>
              <TableCell className="tabular-nums">{formatCurrency(service.price)}</TableCell>
              <TableCell className="text-muted-foreground">
                {service.estimatedHours ? `${service.estimatedHours} س` : "—"}
              </TableCell>
              <TableCell>
                <ServiceStatusBadge service={service} />
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {service.sortOrder}
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
                    <DropdownMenuItem onClick={() => onViewDetails(service)}>
                      <Eye aria-hidden /> عرض التفاصيل
                    </DropdownMenuItem>
                    {canManage && (
                      <DropdownMenuItem onClick={() => onEdit(service)}>
                        <Pencil aria-hidden /> تعديل
                      </DropdownMenuItem>
                    )}
                    {canManage &&
                      (service.isActive ? (
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(service)}>
                          <Trash2 aria-hidden /> تعطيل
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onRestore(service)}>
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
