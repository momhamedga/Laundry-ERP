import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type { InventoryItem } from "@/types/inventory";
import type {
  BarcodeStats,
  BulkGenerateInput,
  CreateTemplateInput,
  GenerateInput,
  LabelTemplate,
  ListTemplatesParams,
  PrintHistoryParams,
  PrintHistoryResult,
  PrintInput,
  ScanHistoryResult,
  ScanResult,
  TemplatesResult,
  UpdateTemplateInput,
} from "@/types/barcode";

function toParams<T extends object>(params: T): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q[k] = String(v);
  return q;
}

// ---- Stats / SKU ----
export async function getBarcodeStats(): Promise<BarcodeStats> {
  const { data } = await apiClient.get<ApiResponse<{ stats: BarcodeStats }>>("/barcodes/stats");
  return data.data.stats;
}
export async function getRandomSku(): Promise<string> {
  const { data } = await apiClient.get<ApiResponse<{ sku: string }>>("/barcodes/random-sku");
  return data.data.sku;
}

// ---- Generate ----
export async function generateBarcode(itemId: string, input: GenerateInput): Promise<InventoryItem> {
  const { data } = await apiClient.post<ApiResponse<{ item: InventoryItem }>>(
    `/barcodes/items/${itemId}/generate`,
    input,
  );
  return data.data.item;
}
export async function regenerateBarcode(itemId: string, type: string): Promise<InventoryItem> {
  const { data } = await apiClient.post<ApiResponse<{ item: InventoryItem }>>(
    `/barcodes/items/${itemId}/regenerate`,
    { type },
  );
  return data.data.item;
}
export async function bulkGenerate(input: BulkGenerateInput): Promise<{ generated: number; skipped: number }> {
  const { data } = await apiClient.post<ApiResponse<{ generated: number; skipped: number }>>(
    "/barcodes/bulk-generate",
    input,
  );
  return data.data;
}
export async function deleteBarcode(itemId: string): Promise<void> {
  await apiClient.delete(`/barcodes/items/${itemId}`);
}

// ---- Print ----
export async function printLabels(input: PrintInput): Promise<{ printed: number; labels: number }> {
  const { data } = await apiClient.post<ApiResponse<{ printed: number; labels: number }>>(
    "/barcodes/print",
    input,
  );
  return data.data;
}
export async function getPrintHistory(params: PrintHistoryParams): Promise<PrintHistoryResult> {
  const { data } = await apiClient.get<ApiListResponse<{ logs: PrintHistoryResult["logs"] }>>(
    "/barcodes/print-history",
    { params: toParams(params) },
  );
  return { logs: data.data.logs, meta: data.meta };
}

// ---- Scan ----
export async function scanCode(code: string, action = "LOOKUP"): Promise<ScanResult> {
  const { data } = await apiClient.post<ApiResponse<{ result: ScanResult }>>("/barcodes/scan", {
    code,
    action,
  });
  return data.data.result;
}
export async function lookupCode(code: string): Promise<ScanResult> {
  const { data } = await apiClient.get<ApiResponse<{ result: ScanResult }>>("/barcodes/lookup", {
    params: { code },
  });
  return data.data.result;
}
export async function getScanHistory(params: { page?: number; limit?: number }): Promise<ScanHistoryResult> {
  const { data } = await apiClient.get<ApiListResponse<{ scans: ScanHistoryResult["scans"] }>>(
    "/barcodes/scans",
    { params: toParams(params) },
  );
  return { scans: data.data.scans, meta: data.meta };
}

// ---- Templates ----
export async function listTemplates(params: ListTemplatesParams): Promise<TemplatesResult> {
  const { data } = await apiClient.get<ApiListResponse<{ templates: LabelTemplate[] }>>(
    "/barcodes/templates",
    { params: toParams(params) },
  );
  return { templates: data.data.templates, meta: data.meta };
}
export async function createTemplate(input: CreateTemplateInput): Promise<LabelTemplate> {
  const { data } = await apiClient.post<ApiResponse<{ template: LabelTemplate }>>(
    "/barcodes/templates",
    input,
  );
  return data.data.template;
}
export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<LabelTemplate> {
  const { data } = await apiClient.patch<ApiResponse<{ template: LabelTemplate }>>(
    `/barcodes/templates/${id}`,
    input,
  );
  return data.data.template;
}
export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/barcodes/templates/${id}`);
}
