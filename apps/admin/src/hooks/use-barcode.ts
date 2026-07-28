"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { barcodeKeys } from "@/lib/query-keys";
import * as service from "@/services/barcode.service";
import type {
  BulkGenerateInput,
  CreateTemplateInput,
  GenerateInput,
  ListTemplatesParams,
  PrintHistoryParams,
  PrintInput,
  UpdateTemplateInput,
} from "@/types/barcode";

// ==================== Queries ====================

export function useBarcodeStatsQuery() {
  return useQuery({ queryKey: barcodeKeys.stats(), queryFn: () => service.getBarcodeStats() });
}
export function useTemplatesQuery(params: ListTemplatesParams) {
  return useQuery({
    queryKey: barcodeKeys.templates(params),
    queryFn: () => service.listTemplates(params),
    placeholderData: keepPreviousData,
  });
}
export function usePrintHistoryQuery(params: PrintHistoryParams) {
  return useQuery({
    queryKey: barcodeKeys.printHistory(params),
    queryFn: () => service.getPrintHistory(params),
    placeholderData: keepPreviousData,
  });
}
export function useScanHistoryQuery(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: barcodeKeys.scanHistory(params),
    queryFn: () => service.getScanHistory(params),
    placeholderData: keepPreviousData,
  });
}

// ==================== Mutations ====================

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: barcodeKeys.all });
    void qc.invalidateQueries({ queryKey: ["inventory"] });
  };
}

export function useGenerateMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: GenerateInput }) =>
      service.generateBarcode(itemId, input),
    onSuccess: () => {
      toast.success("تم توليد الباركود");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useBulkGenerateMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: BulkGenerateInput) => service.bulkGenerate(input),
    onSuccess: (r) => {
      toast.success(`تم توليد ${r.generated} وتخطّي ${r.skipped}`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteBarcodeMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (itemId: string) => service.deleteBarcode(itemId),
    onSuccess: () => {
      toast.success("تم حذف الباركود");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function usePrintMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: PrintInput) => service.printLabels(input),
    onSuccess: (r) => {
      toast.success(`تم تسجيل طباعة ${r.labels} ملصق`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useScanMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ code, action }: { code: string; action?: string }) => service.scanCode(code, action),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateTemplateMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => service.createTemplate(input),
    onSuccess: () => {
      toast.success("تم إنشاء القالب");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateTemplateMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTemplateInput }) =>
      service.updateTemplate(id, input),
    onSuccess: () => {
      toast.success("تم تحديث القالب");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteTemplateMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.deleteTemplate(id),
    onSuccess: () => {
      toast.success("تم حذف القالب");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
