import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CancelOrderInput,
  ChangeOrderStatusInput,
  CreateOrderInput,
  ListOrdersParams,
  ListOrdersResult,
  OrderDetail,
  OrderHistoryEntry,
  OrderListRow,
  UpdateOrderInput,
} from "@/types/orders";

function toQueryParams(params: ListOrdersParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.status) query.status = params.status;
  if (params.paymentStatus) query.paymentStatus = params.paymentStatus;
  if (params.customerId) query.customerId = params.customerId;
  if (params.branchId) query.branchId = params.branchId;
  if (params.receivedFrom) query.receivedFrom = params.receivedFrom;
  if (params.receivedTo) query.receivedTo = params.receivedTo;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const { data } = await apiClient.get<ApiListResponse<{ orders: OrderListRow[] }>>("/orders", {
    params: toQueryParams(params),
  });
  return { orders: data.data.orders, meta: data.meta };
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { data } = await apiClient.get<ApiResponse<{ order: OrderDetail }>>(`/orders/${id}`);
  return data.data.order;
}

export async function getOrderHistory(id: string): Promise<OrderHistoryEntry[]> {
  const { data } = await apiClient.get<ApiResponse<{ history: OrderHistoryEntry[] }>>(
    `/orders/${id}/history`,
  );
  return data.data.history;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderDetail> {
  const { data } = await apiClient.post<ApiResponse<{ order: OrderDetail }>>("/orders", input);
  return data.data.order;
}

/** تعديل تفاصيل الطلب (dueDate/discount/notes) - يُرفض بعد DELIVERED/CANCELLED بالخادم */
export async function updateOrder(id: string, input: UpdateOrderInput): Promise<OrderDetail> {
  const { data } = await apiClient.patch<ApiResponse<{ order: OrderDetail }>>(
    `/orders/${id}`,
    input,
  );
  return data.data.order;
}

/** تقدّم للأمام فقط - الخادم يرفض الرجوع أو تكرار CANCELLED من هذا المسار */
export async function changeOrderStatus(
  id: string,
  input: ChangeOrderStatusInput,
): Promise<OrderDetail> {
  const { data } = await apiClient.patch<ApiResponse<{ order: OrderDetail }>>(
    `/orders/${id}/status`,
    input,
  );
  return data.data.order;
}

export async function cancelOrder(id: string, input: CancelOrderInput): Promise<OrderDetail> {
  const { data } = await apiClient.post<ApiResponse<{ order: OrderDetail }>>(
    `/orders/${id}/cancel`,
    input,
  );
  return data.data.order;
}
