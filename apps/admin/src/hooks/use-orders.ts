"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { orderKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/axios";
import * as ordersService from "@/services/orders.service";
import type { OrdersFilters } from "@/hooks/use-orders-filters";
import type {
  CancelOrderInput,
  ChangeOrderStatusInput,
  CreateOrderInput,
  ListOrdersParams,
  UpdateOrderInput,
} from "@/types/orders";

/** customerName بالفلتر عرض فقط - لا يُرسل للخادم ولا يدخل مفتاح الاستعلام */
function toListParams(filters: OrdersFilters): ListOrdersParams {
  return {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    customerId: filters.customerId,
    branchId: filters.branchId,
    receivedFrom: filters.receivedFrom,
    receivedTo: filters.receivedTo,
    dueFrom: filters.dueFrom,
    dueTo: filters.dueTo,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };
}

export function useOrdersQuery(filters: OrdersFilters) {
  const params = toListParams(filters);
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersService.listOrders(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrderDetailQuery(id: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ""),
    queryFn: () => ordersService.getOrder(id as string),
    enabled: !!id,
  });
}

export function useOrderHistoryQuery(id: string | null) {
  return useQuery({
    queryKey: orderKeys.history(id ?? ""),
    queryFn: () => ordersService.getOrderHistory(id as string),
    enabled: !!id,
  });
}

/** إنشاء طلب جديد - يُبطل قوائم الطلبات عند النجاح فقط (لا toast هنا؛ المعالج يعرض Success State مخصصة) */
export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersService.createOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** يُبطل القائمة + تفاصيل هذا الطلب عند النجاح - نمط مشترك لكل تعديلات الطلب */
function useInvalidateOrder(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: orderKeys.history(id) });
  };
}

/** تعديل تفاصيل الطلب (dueDate/discount/notes فقط - بلا بنود) */
export function useUpdateOrderMutation(id: string) {
  const invalidate = useInvalidateOrder(id);
  return useMutation({
    mutationFn: (input: UpdateOrderInput) => ordersService.updateOrder(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث الطلب");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/** تغيير حالة الطلب - تقدّم للأمام فقط، يُبطل عند الوصول لحالة نهائية (يُتحقق بالخادم) */
export function useChangeOrderStatusMutation(id: string) {
  const invalidate = useInvalidateOrder(id);
  return useMutation({
    mutationFn: (input: ChangeOrderStatusInput) => ordersService.changeOrderStatus(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث حالة الطلب");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/** إلغاء الطلب - مسار منفصل عن تحديث الحالة، مرفوض بعد DELIVERED/CANCELLED */
export function useCancelOrderMutation(id: string) {
  const invalidate = useInvalidateOrder(id);
  return useMutation({
    mutationFn: (input: CancelOrderInput) => ordersService.cancelOrder(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("تم إلغاء الطلب");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
