"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { CAPTURE_REVIEW_PIN_TOP_CLASS } from "@/components/document-capture/capture-review-panel";
import { CaptureReviewPanelLoading } from "@/components/document-capture/capture-review-panel";
import { CaptureApplyRecoveryBanner } from "@/components/document-capture/capture-apply-recovery-banner";
import { CaptureApplyReviewBanner } from "@/components/document-capture/capture-apply-review-banner";
import {
  CaptureSheetCompileStatusBanner,
} from "@/components/document-capture/capture-sheet-field-hint";
import { SchedaLavorazioniFormBody } from "@/components/lavorazioni/schede/scheda-lavorazioni-form-body";
import { SchedaRicambiFormBody } from "@/components/lavorazioni/schede/scheda-ricambi-form-body";
import type { CaptureSchedaCompileDraft } from "@/lib/document-capture/capture-acquisition-draft";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  buildCaptureLavorazioniCompileData,
  buildCaptureRicambiCompileData,
  countCaptureSheetHintsNeedingReview,
  reconcileCaptureSheetHintAfterEdit,
} from "@/lib/document-capture/capture-sheet-field-hints";
import {
  captureFieldRowsToSchedaFields,
  schedaFieldsToCompilePayload,
  type CaptureFieldPatch,
  type CaptureSchedaCompilePayload,
} from "@/lib/document-capture/capture-scheda-compile-payload";
import { useCaptureApplyFlow } from "@/lib/document-capture/use-capture-apply-flow";
import {
  captureReviewAllowsForceApply,
  type ValidateCaptureResult,
} from "@/lib/document-capture/validation/validate-capture-for-apply";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import type { SchedaLavorazioniFields, SchedaRicambiFields } from "@/types/schede";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { LoadingSpinner } from "@/components/design-system/loading";

export const CAPTURE_SHEET_COMPILE_FORM_ID = "capture-sheet-compile-form";

export type CompileStatus =
  | "loading"
  | "editing"
  | "dirty"
  | "validating"
  | "ready"
  | "applying"
  | "error";

const HINT_RECONCILE_MS = 250;
const DRY_RUN_DEBOUNCE_MS = 500;
const COMPILE_DRAFT_DEBOUNCE_MS = 400;

function CaptureValidationIssuesBanner({ validation }: { validation: ValidateCaptureResult }) {
  if (validation.status === "READY" && validation.issues.length === 0) return null;
  return (
    <div
      role="status"
      className={`mb-2 rounded-lg border px-3 py-2 text-sm ${
        validation.status === "BLOCKED"
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40"
      }`}
    >
      <p className="font-medium">
        {validation.status === "BLOCKED"
          ? "Import bloccato — correggi gli errori"
          : "Revisione consigliata prima dell'import"}
      </p>
      <ul className="mt-1 list-disc pl-4 text-xs">
        {validation.issues.map((issue) => (
          <li key={`${issue.code}-${issue.fieldKey ?? ""}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

const CaptureSheetCompilePreview = memo(function CaptureSheetCompilePreview({ captureId }: { captureId: string }) {
  return (
    <div className={`lg:sticky ${CAPTURE_REVIEW_PIN_TOP_CLASS} lg:z-[1] lg:self-start`}>
      <CaptureDocumentFilePreview captureId={captureId} pinned />
    </div>
  );
});

export function CaptureSchedaSheetCompileStep({
  captureId,
  tipo,
  fieldRows,
  sharedGlobalOpts,
  magazzino = [],
  resumeSheetCompile = null,
  onSheetCompileChange,
  onApplySuccess,
  onCompileError,
  onSubmitBusyChange,
  onCompileStatusChange,
}: {
  captureId: string;
  tipo: "lavorazioni" | "ricambi";
  fieldRows: readonly CaptureFieldRow[];
  sharedGlobalOpts?: GlobalOptionsSlice;
  magazzino?: readonly RicambioMagazzino[];
  resumeSheetCompile?: CaptureSchedaCompileDraft | null;
  onSheetCompileChange?: (snapshot: CaptureSchedaCompileDraft) => void;
  onApplySuccess?: (lavorazioneId: string) => void;
  onCompileError?: (message: string) => void;
  onSubmitBusyChange?: (busy: boolean) => void;
  onCompileStatusChange?: (status: CompileStatus) => void;
}) {
  const applyFlow = useCaptureApplyFlow(captureId);
  const [compileStatus, setCompileStatus] = useState<CompileStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<SchedaLavorazioniFields | SchedaRicambiFields | null>(null);
  const [rowHints, setRowHints] = useState<Record<string, CaptureSheetRowHint>>({});
  const [ocrBaseline, setOcrBaseline] = useState<CaptureFieldPatch[]>([]);
  const [operationId, setOperationId] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const dryRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHintKeysRef = useRef(new Set<string>());
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const rowHintsRef = useRef(rowHints);
  rowHintsRef.current = rowHints;
  const operationIdRef = useRef(operationId);
  operationIdRef.current = operationId;

  const addettiRecords = sharedGlobalOpts?.lavorazioni.addettiRecords ?? [];
  const addettiLista = sharedGlobalOpts?.lavorazioni.addetti ?? [];

  const setStatus = useCallback(
    (next: CompileStatus) => {
      setCompileStatus(next);
      onCompileStatusChange?.(next);
    },
    [onCompileStatusChange],
  );

  useEffect(() => {
    if (!sharedGlobalOpts || sharedGlobalOpts.isLoading) return;
    let cancelled = false;
    setStatus("loading");
    setLoadError(null);
    try {
      const mapped = captureFieldRowsToSchedaFields(tipo, fieldRows, {
        addettiRecords,
        magazzino,
      });
      const compileData =
        tipo === "lavorazioni"
          ? buildCaptureLavorazioniCompileData({
              fieldRows,
              fields: mapped as SchedaLavorazioniFields,
              addettiRecords,
            })
          : buildCaptureRicambiCompileData({
              fieldRows,
              fields: mapped as SchedaRicambiFields,
              magazzino,
            });
      if (cancelled) return;
      const resumedFields = resumeSheetCompile?.payload
        ? schedaFieldsFromResume(resumeSheetCompile, tipo, { addettiRecords, magazzino })
        : compileData.fields;
      setFields(resumedFields);
      setRowHints(compileData.hints);
      setOcrBaseline(resumeSheetCompile?.baseline ?? compileData.ocrBaseline);
      setOperationId(resumeSheetCompile?.payload.operationId ?? null);
      setStatus("editing");
    } catch (e) {
      if (cancelled) return;
      const msg = e instanceof Error ? e.message : "Impossibile preparare la scheda";
      setLoadError(msg);
      setStatus("error");
      onCompileError?.(msg);
    }
    return () => {
      cancelled = true;
    };
  }, [
    addettiRecords,
    fieldRows,
    magazzino,
    onCompileError,
    resumeSheetCompile,
    setStatus,
    sharedGlobalOpts,
    tipo,
  ]);

  function schedaFieldsFromResume(
    draft: CaptureSchedaCompileDraft,
    schedaTipo: "lavorazioni" | "ricambi",
    opts: { addettiRecords?: typeof addettiRecords; magazzino?: typeof magazzino },
  ): SchedaLavorazioniFields | SchedaRicambiFields {
    if (draft.payload.captureId !== captureId || draft.payload.tipo !== schedaTipo) {
      return captureFieldRowsToSchedaFields(schedaTipo, fieldRows, opts);
    }
    const rows: CaptureFieldRow[] = draft.payload.fields.map((p) => ({
      field_key: p.fieldKey,
      confirmed_value: p.action === "clear" ? null : p.value,
      normalized_value: p.action === "clear" ? null : p.value,
    }));
    return captureFieldRowsToSchedaFields(schedaTipo, rows, opts);
  }

  const invalidateDryRun = useCallback(() => {
    applyFlow.setValidation(null);
  }, [applyFlow]);

  const runDebouncedDryRun = useCallback(() => {
    if (dryRunTimerRef.current) clearTimeout(dryRunTimerRef.current);
    dryRunTimerRef.current = setTimeout(() => {
      dryRunTimerRef.current = null;
      if (!fieldsRef.current) return;
      setStatus("validating");
      void applyFlow
        .runDryRun()
        .then(({ validation }) => {
          if (validation?.status === "BLOCKED") {
            setStatus("error");
            return;
          }
          setStatus("ready");
        })
        .catch((e) => {
          setStatus("error");
          onCompileError?.(e instanceof Error ? e.message : "Verifica non riuscita");
        });
    }, DRY_RUN_DEBOUNCE_MS);
  }, [applyFlow, onCompileError, setStatus]);

  useEffect(() => {
    if (compileStatus !== "editing" && compileStatus !== "dirty") return;
    runDebouncedDryRun();
    return () => {
      if (dryRunTimerRef.current) clearTimeout(dryRunTimerRef.current);
    };
  }, [compileStatus, fields, runDebouncedDryRun]);

  useEffect(
    () => () => {
      if (hintReconcileTimerRef.current) clearTimeout(hintReconcileTimerRef.current);
      if (dryRunTimerRef.current) clearTimeout(dryRunTimerRef.current);
    },
    [],
  );

  const flushHintReconcile = useCallback(() => {
    hintReconcileTimerRef.current = null;
    if (pendingHintKeysRef.current.size === 0) return;
    const keys = [...pendingHintKeysRef.current];
    pendingHintKeysRef.current.clear();
    const catalogOpts = { magazzino, addettiRecords };
    setRowHints((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of keys) {
        const hint = prev[key];
        if (!hint) continue;
        const value = resolveFieldValueForHint(key, fieldsRef.current, tipo);
        const reconciled = reconcileCaptureSheetHintAfterEdit(key, value, hint, catalogOpts);
        if (reconciled) next[key] = reconciled;
        else delete next[key];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [addettiRecords, magazzino, tipo]);

  const handleFieldsChange = useCallback(
    (next: SchedaLavorazioniFields | SchedaRicambiFields) => {
      setFields(next);
      const prevKeys = Object.keys(rowHintsRef.current);
      for (const key of prevKeys) pendingHintKeysRef.current.add(key);
      if (pendingHintKeysRef.current.size > 0) {
        if (hintReconcileTimerRef.current) clearTimeout(hintReconcileTimerRef.current);
        hintReconcileTimerRef.current = setTimeout(flushHintReconcile, HINT_RECONCILE_MS);
      }
      if (compileStatus === "ready") {
        invalidateDryRun();
        setStatus("dirty");
      }
    },
    [compileStatus, flushHintReconcile, invalidateDryRun, setStatus],
  );

  useEffect(() => {
    if (!onSheetCompileChange || !fields || compileStatus === "loading") return;
    const timer = window.setTimeout(() => {
      const payload = schedaFieldsToCompilePayload(tipo, captureId, fields, {
        operationId: operationIdRef.current ?? undefined,
      });
      if (!operationIdRef.current) setOperationId(payload.operationId);
      onSheetCompileChange({
        payload,
        baseline: ocrBaseline,
      });
    }, COMPILE_DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [captureId, fields, ocrBaseline, onSheetCompileChange, compileStatus, tipo]);

  const reviewCount = useMemo(() => countCaptureSheetHintsNeedingReview(rowHints), [rowHints]);

  const submitBusy = applyFlow.busy || compileStatus === "applying";
  useEffect(() => {
    onSubmitBusyChange?.(submitBusy);
    return () => onSubmitBusyChange?.(false);
  }, [onSubmitBusyChange, submitBusy]);

  const statusBanner = useMemo(() => {
    switch (compileStatus) {
      case "editing":
        return <CaptureSheetCompileStatusBanner tone="info" message="Completa la verifica prima di importare" />;
      case "validating":
        return <CaptureSheetCompileStatusBanner tone="busy" message="Controllo dati…" />;
      case "ready":
        return <CaptureSheetCompileStatusBanner tone="success" message="Import pronto" />;
      case "dirty":
        return (
          <CaptureSheetCompileStatusBanner tone="warning" message="Dati modificati — verifica in corso…" />
        );
      case "applying":
        return <CaptureSheetCompileStatusBanner tone="busy" message="Import in corso…" />;
      default:
        return null;
    }
  }, [compileStatus]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!fields || compileStatus !== "ready" || submittingRef.current) return;
      submittingRef.current = true;
      setStatus("applying");
      const payload = schedaFieldsToCompilePayload(tipo, captureId, fields, {
        operationId: operationIdRef.current ?? undefined,
      });
      setOperationId(payload.operationId);
      void (async () => {
        try {
          const result = await applyFlow.applyFromScheda(payload);
          onApplySuccess?.(result.lavorazioneId);
        } catch (err) {
          if (err instanceof Error && err.message === "REVIEW_REQUIRED") {
            setStatus("ready");
            return;
          }
          setStatus("error");
          onCompileError?.(err instanceof Error ? err.message : "Apply non riuscito");
        } finally {
          submittingRef.current = false;
        }
      })();
    },
    [applyFlow, captureId, compileStatus, fields, onApplySuccess, onCompileError, setStatus, tipo],
  );

  if (compileStatus === "loading" || !sharedGlobalOpts || !fields) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <CaptureReviewPanelLoading title="Anteprima documento" message="Caricamento anteprima…" skeleton="preview" />
        <CaptureReviewPanelLoading title="Verifica i dati letti" message="Preparazione campi…" skeleton="fields" />
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-[color:var(--cab-danger)]">{loadError}</p>;
  }

  const validationPanel = applyFlow.validation ? (
    <CaptureValidationIssuesBanner validation={applyFlow.validation} />
  ) : null;

  return (
    <div className="relative grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      {submitBusy ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg bg-[color:var(--cab-bg)]/80 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingSpinner size="md" />
        </div>
      ) : null}
      <CaptureSheetCompilePreview captureId={captureId} />
      <form id={CAPTURE_SHEET_COMPILE_FORM_ID} onSubmit={handleSubmit} className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-[color:var(--cab-fg)]">Verifica i dati letti</h3>
        {statusBanner}
        <CaptureApplyRecoveryBanner
          visible={applyFlow.recoveryAvailable}
          busy={applyFlow.busy}
          onResume={() => {
            void (async () => {
              try {
                const result = await applyFlow.resumeApply();
                onApplySuccess?.(result.lavorazioneId);
              } catch (err) {
                onCompileError?.(err instanceof Error ? err.message : "Ripresa non riuscita");
              }
            })();
          }}
        />
        {validationPanel}
        <CaptureApplyReviewBanner
          validation={applyFlow.validation}
          busy={applyFlow.busy}
          onForceReview={() => {
            if (!fields) return;
            const payload = schedaFieldsToCompilePayload(tipo, captureId, fields, {
              operationId: operationIdRef.current ?? undefined,
            });
            void (async () => {
              try {
                const result = await applyFlow.applyFromScheda(payload, { forceReview: true });
                onApplySuccess?.(result.lavorazioneId);
              } catch (err) {
                onCompileError?.(err instanceof Error ? err.message : "Apply non riuscito");
              }
            })();
          }}
        />
        {applyFlow.error ? (
          <div
            role="alert"
            className="mb-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {applyFlow.error}
          </div>
        ) : null}
        {tipo === "lavorazioni" ? (
          <SchedaLavorazioniFormBody
            value={fields as SchedaLavorazioniFields}
            onChange={handleFieldsChange}
            globalOpts={{ addettiLista }}
            rowHints={rowHints}
            reviewCount={reviewCount}
          />
        ) : (
          <SchedaRicambiFormBody
            value={fields as SchedaRicambiFields}
            onChange={handleFieldsChange}
            globalOpts={{ addettiLista, magazzino }}
            rowHints={rowHints}
            reviewCount={reviewCount}
            variant="capture"
          />
        )}
      </form>
    </div>
  );
}

function resolveFieldValueForHint(
  fieldKey: string,
  fields: SchedaLavorazioniFields | SchedaRicambiFields | null,
  tipo: "lavorazioni" | "ricambi",
): string {
  if (!fields) return "";
  const m = fieldKey.match(/^riga_(\d+)_(.+)$/);
  if (!m) {
    if (fieldKey === "targa_matricola") return fields.identificazioneMacchina;
    return "";
  }
  const rowNum = Number.parseInt(m[1]!, 10);
  const suffix = m[2]!;
  if (tipo === "lavorazioni") {
    const row = (fields as SchedaLavorazioniFields).righe[rowNum - 1];
    if (!row) return "";
    if (suffix === "lavorazione") return row.lavorazioniEffettuate;
    if (suffix === "nome") return row.addettiAssegnati?.[0]?.addetto ?? "";
    if (suffix === "ore") return String(row.addettiAssegnati?.[0]?.oreImpiegate ?? "");
    return "";
  }
  const row = (fields as SchedaRicambiFields).righe[rowNum - 1];
  if (!row) return "";
  if (suffix === "nome") return row.ricambioNome;
  if (suffix === "codice") return row.codice;
  if (suffix === "qt") return String(row.quantita);
  if (suffix === "data") return row.dataUtilizzo;
  return "";
}

export function isSheetCompileImportEnabled(status: CompileStatus): boolean {
  return status === "ready";
}

export { captureReviewAllowsForceApply };
