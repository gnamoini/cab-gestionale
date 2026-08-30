"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToastContext } from "@/context/toast-context";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { UPLOAD_SUCCESS_VISIBLE_MS } from "@/lib/upload/upload-feedback-messages";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import type {
  RunUploadParams,
  TrackUploadParams,
  UploadFeedbackItem,
  UploadFeedbackPhase,
} from "@/lib/upload/upload-feedback-types";
import {
  createUploadId,
  ensureMinUploadLoading,
  uploadErrorMessage,
} from "@/lib/upload/upload-feedback-utils";

type UploadFeedbackContextValue = {
  items: UploadFeedbackItem[];
  activeCount: number;
  isUploading: boolean;
  trackUpload: <T>(params: TrackUploadParams<T>) => Promise<{ ok: true; data: T } | { ok: false; error: string }>;
  runUpload: <T>(params: RunUploadParams<T>) => Promise<{ ok: true; data: T } | { ok: false; error: string }>;
  setProgress: (id: string, pct: number | null) => void;
  clearItem: (id: string) => void;
};

const UploadFeedbackContext = createContext<UploadFeedbackContextValue | null>(null);

function patchItem(
  prev: UploadFeedbackItem[],
  id: string,
  patch: Partial<UploadFeedbackItem>,
): UploadFeedbackItem[] {
  return prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function UploadFeedbackProvider({ children }: { children: ReactNode }) {
  const { push: pushToast } = useToastContext();
  const [items, setItems] = useState<UploadFeedbackItem[]>([]);
  const itemsRef = useRef(items);
  const trackUploadRef = useRef<
    <T>(params: TrackUploadParams<T>) => Promise<{ ok: true; data: T } | { ok: false; error: string }>
  >(async () => ({ ok: false, error: "Upload non inizializzato" }));
  const runUploadRef = useRef<
    <T>(params: RunUploadParams<T>) => Promise<{ ok: true; data: T } | { ok: false; error: string }>
  >(async () => ({ ok: false, error: "Upload non inizializzato" }));
  const removeTimeoutsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const timeouts = removeTimeoutsRef.current;
    return () => {
      for (const t of timeouts) clearTimeout(t);
      timeouts.clear();
    };
  }, []);

  const clearItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const scheduleRemove = useCallback(
    (id: string, delayMs: number) => {
      const t = window.setTimeout(() => {
        removeTimeoutsRef.current.delete(t);
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, delayMs);
      removeTimeoutsRef.current.add(t);
    },
    [],
  );

  const setPhase = useCallback((id: string, phase: UploadFeedbackPhase, error: string | null = null) => {
    setItems((prev) => patchItem(prev, id, { phase, error }));
  }, []);

  const setProgress = useCallback((id: string, pct: number | null) => {
    setItems((prev) => patchItem(prev, id, { progress: pct }));
  }, []);

  const executeTracked = useCallback(
    async <T,>(
      meta: { id: string; fileName: string; label: string; file: File | null },
      params: {
        run: () => Promise<T>;
        onProgress?: (pct: number) => void;
        onSuccess?: (data: T) => void;
        onError?: (message: string) => void;
        successToast?: string | false;
        showErrorToast?: boolean;
      },
    ): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
      const startedAt = Date.now();
      setPhase(meta.id, "uploading", null);
      setProgress(meta.id, null);

      const reportProgress = (pct: number) => {
        setProgress(meta.id, pct);
        params.onProgress?.(pct);
      };

      try {
        const data = await params.run();
        reportProgress(100);
        await ensureMinUploadLoading(startedAt);
        setPhase(meta.id, "success", null);
        params.onSuccess?.(data);
        if (params.successToast !== false) {
          pushToast(params.successToast ?? GESTIONALE_TOAST.successUploaded, "success");
        }
        scheduleRemove(meta.id, UPLOAD_SUCCESS_VISIBLE_MS);
        return { ok: true, data };
      } catch (e) {
        const message = uploadErrorMessage(e);
        await ensureMinUploadLoading(startedAt);
        setPhase(meta.id, "error", message);
        params.onError?.(message);
        if (params.showErrorToast !== false) {
          pushToast(humanizeGestionaleError(message), "error");
        }
        return { ok: false, error: message };
      }
    },
    [pushToast, scheduleRemove, setPhase, setProgress],
  );

  const trackUpload = useCallback(
    async <T,>(params: TrackUploadParams<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
      const id = createUploadId();
      const fileName = params.file.name.trim() || "file";
      const label = params.label?.trim() || fileName;

      const retry = () => {
        const item = itemsRef.current.find((x) => x.id === id);
        const file = item?.file ?? params.file;
        void trackUploadRef.current({ ...params, file });
      };

      const item: UploadFeedbackItem = {
        id,
        fileName,
        label,
        phase: "selected",
        error: null,
        startedAt: Date.now(),
        progress: null,
        file: params.file,
        retry,
      };

      setItems((prev) => [...prev, item]);

      return executeTracked(
        { id, fileName, label, file: params.file },
        {
          run: () => params.run(params.file),
          onProgress: params.onProgress,
          onSuccess: params.onSuccess,
          onError: params.onError,
          successToast: params.successToast,
          showErrorToast: params.showErrorToast,
        },
      );
    },
    [executeTracked],
  );

  const runUpload = useCallback(
    async <T,>(params: RunUploadParams<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
      const id = createUploadId();
      const fileName = params.fileName.trim() || "file";
      const label = params.label?.trim() || fileName;

      const retry = () => {
        void runUploadRef.current(params);
      };

      setItems((prev) => [
        ...prev,
        {
          id,
          fileName,
          label,
          phase: "uploading" as const,
          error: null,
          startedAt: Date.now(),
          progress: null,
          file: null,
          retry,
        },
      ]);

      return executeTracked(
        { id, fileName, label, file: null },
        {
          run: params.run,
          onProgress: params.onProgress,
          onSuccess: params.onSuccess,
          onError: params.onError,
          successToast: params.successToast,
          showErrorToast: params.showErrorToast,
        },
      );
    },
    [executeTracked],
  );

  useEffect(() => {
    trackUploadRef.current = trackUpload;
    runUploadRef.current = runUpload;
  }, [trackUpload, runUpload]);

  const activeCount = items.filter((x) => x.phase === "uploading" || x.phase === "selected").length;
  const isUploading = items.some((x) => x.phase === "uploading");

  const value = useMemo(
    () => ({
      items,
      activeCount,
      isUploading,
      trackUpload,
      runUpload,
      setProgress,
      clearItem,
    }),
    [items, activeCount, isUploading, trackUpload, runUpload, setProgress, clearItem],
  );

  return <UploadFeedbackContext.Provider value={value}>{children}</UploadFeedbackContext.Provider>;
}

export function useUploadFeedback(): UploadFeedbackContextValue {
  const ctx = useContext(UploadFeedbackContext);
  if (!ctx) {
    throw new Error("useUploadFeedback must be used within UploadFeedbackProvider");
  }
  return ctx;
}

export function useUploadFeedbackOptional(): UploadFeedbackContextValue | null {
  return useContext(UploadFeedbackContext);
}
