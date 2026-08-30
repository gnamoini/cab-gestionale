"use client";

/* eslint-disable react-hooks/immutability -- lint phase2: preserve existing hook contract */

/* eslint-disable react-hooks/refs -- submit hook exposes formRef/formProps for JSX wiring */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { CaptureReviewPanelLoading, CaptureReviewSplitLayout } from "@/components/document-capture/capture-review-panel";
import { CaptureApplyRecoveryBanner } from "@/components/document-capture/capture-apply-recovery-banner";
import { SchedaLavorazioniFormBody } from "@/components/lavorazioni/schede/scheda-lavorazioni-form-body";
import { SchedaRicambiFormBody } from "@/components/lavorazioni/schede/scheda-ricambi-form-body";
import type { CaptureSchedaCompileDraft } from "@/lib/document-capture/capture-acquisition-draft";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  buildCaptureLavorazioniCompileData,
  buildCaptureRicambiCompileData,
  countCaptureSheetHintsNeedingReview,
} from "@/lib/document-capture/capture-sheet-field-hints";
import {
  captureFieldRowsToSchedaFields,
  schedaFieldsToCompilePayload,
  type CaptureFieldPatch,
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
import { CaptureExistingSchedaConfirmDialog } from "@/components/document-capture/capture-existing-scheda-confirm-dialog";
import { describeCaptureLavorazioneAssignTarget } from "@/lib/document-capture/capture-lavorazione-match";
import { describeLavorazioneAssignRowParts } from "@/lib/document-capture/capture-manual-assign-state";
import { lavorazioneHasExistingScheda } from "@/lib/document-capture/capture-existing-scheda-presence";
import { patchCaptureLavorazioneLink } from "@/lib/document-capture/patch-capture-lavorazione-link.client";
import { applyCaptureRicambiScarichiAfterImport } from "@/lib/document-capture/capture-ricambi-scarico-after-import";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaTipo } from "@/types/schede";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePwaUpdateGuard } from "@/lib/pwa/pwa-update-guard";

export const CAPTURE_SHEET_COMPILE_FORM_ID = "capture-sheet-compile-form";

export type CompileStatus =
  | "loading"
  | "editing"
  | "dirty"
  | "validating"
  | "ready"
  | "applying"
  | "error";

const DRY_RUN_DEBOUNCE_MS = 500;
const COMPILE_DRAFT_DEBOUNCE_MS = 400;
const HINT_REBUILD_DEBOUNCE_MS = 250;

function CaptureValidationIssuesBanner({ validation }: { validation: ValidateCaptureResult }) {
  if (validation.issues.length === 0) return null;
  if (validation.status === "BLOCKED") {
    return (
      <div
        role="status"
        className="mb-2 rounded-lg border px-3 py-2 text-sm border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40"
      >
        <p className="font-medium">Import bloccato — correggi gli errori</p>
        <ul className="mt-1 list-disc pl-4 text-xs">
          {validation.issues.map((issue) => (
            <li key={`${issue.code}-${issue.fieldKey ?? ""}`}>{issue.message}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (validation.status === "REVIEW") {
    return (
      <div
        role="status"
        className="mb-2 rounded-lg border px-3 py-2 text-sm border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40"
      >
        <p className="font-medium">Revisione richiesta prima dell&apos;import</p>
        <ul className="mt-1 list-disc pl-4 text-xs">
          {validation.issues
            .filter((issue) => issue.severity === "warning" && issue.code !== "RICAMBIO_NOT_FOUND")
            .map((issue) => (
              <li key={`${issue.code}-${issue.fieldKey ?? ""}`}>{issue.message}</li>
            ))}
        </ul>
      </div>
    );
  }
  return null;
}

const CaptureSheetCompilePreview = memo(function CaptureSheetCompilePreview({ captureId }: { captureId: string }) {
  return <CaptureDocumentFilePreview captureId={captureId} pinned />;
});

export function CaptureSchedaSheetCompileStep({
  captureId,
  tipo,
  fieldRows,
  sharedGlobalOpts,
  magazzino = [],
  assignLavorazioneId = null,
  attive = [],
  schedeStore = {},
  resumeSheetCompile = null,
  onSheetCompileChange,
  onApplySuccess,
  onViewExistingScheda,
  onCompileError,
  onSubmitBusyChange,
  onCompileStatusChange,
}: {
  captureId: string;
  tipo: "lavorazioni" | "ricambi";
  fieldRows: readonly CaptureFieldRow[];
  sharedGlobalOpts?: GlobalOptionsSlice;
  magazzino?: readonly RicambioMagazzino[];
  assignLavorazioneId?: string | null;
  attive?: readonly LavorazioneAttiva[];
  schedeStore?: LavorazioneSchedeStore;
  resumeSheetCompile?: CaptureSchedaCompileDraft | null;
  onSheetCompileChange?: (snapshot: CaptureSchedaCompileDraft) => void;
  onApplySuccess?: (lavorazioneId: string) => void;
  onViewExistingScheda?: (lavorazioneId: string, schedaTipo: SchedaTipo) => void | Promise<boolean>;
  onCompileError?: (message: string) => void;
  onSubmitBusyChange?: (busy: boolean) => void;
  onCompileStatusChange?: (status: CompileStatus) => void;
}) {
  const applyFlow = useCaptureApplyFlow(captureId);
  const gestToast = useGestionaleToast();
  const qc = useQueryClient();
  const [compileStatus, setCompileStatus] = useState<CompileStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<SchedaLavorazioniFields | SchedaRicambiFields | null>(null);
  const [rowHints, setRowHints] = useState<Record<string, CaptureSheetRowHint>>({});
  const [ocrBaseline, setOcrBaseline] = useState<CaptureFieldPatch[]>([]);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [existingSchedaPromptOpen, setExistingSchedaPromptOpen] = useState(false);
  usePwaUpdateGuard(
    Boolean(fields && compileStatus !== "loading" && compileStatus !== "applying"),
    "Completa o salva l'acquisizione documento prima di aggiornare l'app.",
  );

  const submittingRef = useRef(false);
  const pendingApplyRef = useRef<(() => Promise<void>) | null>(null);
  const dryRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintRebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const rowHintsRef = useRef(rowHints);
  rowHintsRef.current = rowHints;
  const operationIdRef = useRef(operationId);
  operationIdRef.current = operationId;
  const ocrBaselineRef = useRef(ocrBaseline);
  ocrBaselineRef.current = ocrBaseline;
  const compileStatusRef = useRef(compileStatus);
  compileStatusRef.current = compileStatus;

  const addettiRecords = useMemo(
    () => sharedGlobalOpts?.lavorazioni.addettiRecords ?? [],
    [sharedGlobalOpts?.lavorazioni.addettiRecords],
  );
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
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
              addettiRecords,
            });
      if (cancelled) return;
      const resumedFields = resumeSheetCompile?.payload
        ? schedaFieldsFromResume(resumeSheetCompile, tipo, { addettiRecords, magazzino })
        : compileData.fields;
      setFields(resumedFields);
      const hintsSource =
        resumedFields === compileData.fields
          ? compileData
          : tipo === "lavorazioni"
            ? buildCaptureLavorazioniCompileData({
                fieldRows,
                fields: resumedFields as SchedaLavorazioniFields,
                addettiRecords,
              })
            : buildCaptureRicambiCompileData({
                fieldRows,
                fields: resumedFields as SchedaRicambiFields,
                magazzino,
                addettiRecords,
              });
      setRowHints(hintsSource.hints);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- DIRTY_DEFERRED: schedaFieldsFromResume is a local helper tied to captureId/fieldRows
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
          if (validation) applyFlow.setValidation(validation);
          if (validation?.status === "BLOCKED" || validation?.status === "REVIEW") {
            setStatus("editing");
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
      if (dryRunTimerRef.current) clearTimeout(dryRunTimerRef.current);
      if (hintRebuildTimerRef.current) clearTimeout(hintRebuildTimerRef.current);
    },
    [],
  );

  const scheduleRowHintsRebuild = useCallback(() => {
      if (hintRebuildTimerRef.current) clearTimeout(hintRebuildTimerRef.current);
      hintRebuildTimerRef.current = setTimeout(() => {
        hintRebuildTimerRef.current = null;
        const current = fieldsRef.current;
        if (!current) return;
        if (tipo === "lavorazioni") {
          setRowHints(
            buildCaptureLavorazioniCompileData({
              fieldRows,
              fields: current as SchedaLavorazioniFields,
              addettiRecords,
            }).hints,
          );
        } else {
          setRowHints(
            buildCaptureRicambiCompileData({
              fieldRows,
              fields: current as SchedaRicambiFields,
              magazzino,
              addettiRecords,
            }).hints,
          );
        }
      }, HINT_REBUILD_DEBOUNCE_MS);
  }, [addettiRecords, fieldRows, magazzino, tipo]);

  const handleFieldsChange = useCallback(
    (next: SchedaLavorazioniFields | SchedaRicambiFields) => {
      fieldsRef.current = next;
      setFields(next);
      scheduleRowHintsRebuild();
      if (compileStatus === "ready" || compileStatus === "error") {
        invalidateDryRun();
        setStatus("dirty");
      }
    },
    [compileStatus, invalidateDryRun, scheduleRowHintsRebuild, setStatus],
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
    return () => {
      window.clearTimeout(timer);
      if (!onSheetCompileChange || !fieldsRef.current || compileStatusRef.current === "loading") return;
      const payload = schedaFieldsToCompilePayload(tipo, captureId, fieldsRef.current, {
        operationId: operationIdRef.current ?? undefined,
      });
      onSheetCompileChange({
        payload,
        baseline: ocrBaselineRef.current,
      });
    };
  }, [captureId, fields, ocrBaseline, onSheetCompileChange, compileStatus, tipo]);

  const reviewCount = useMemo(() => countCaptureSheetHintsNeedingReview(rowHints), [rowHints]);

  const existingSchedaTargetLabel = useMemo(() => {
    const lavId = assignLavorazioneId?.trim();
    if (!lavId) return "";
    return describeCaptureLavorazioneAssignTarget(lavId, attive, schedeStore);
  }, [assignLavorazioneId, attive, schedeStore]);

  const captureIdentParts = useMemo(() => {
    const lavId = assignLavorazioneId?.trim();
    if (!lavId) return null;
    return describeLavorazioneAssignRowParts(lavId, attive, schedeStore);
  }, [assignLavorazioneId, attive, schedeStore]);

  const executeApply = useCallback(async () => {
    if (!fields || submittingRef.current) return;
    submittingRef.current = true;
    setStatus("applying");
    const payload = schedaFieldsToCompilePayload(tipo, captureId, fields, {
      operationId: operationIdRef.current ?? undefined,
    });
    setOperationId(payload.operationId);
    try {
      const linkedLavorazioneId = assignLavorazioneId?.trim();
      if (linkedLavorazioneId) {
        await patchCaptureLavorazioneLink(captureId, linkedLavorazioneId);
      }
      const result = await applyFlow.applyFromScheda(payload);
      if (tipo === "ricambi") {
        const ricFields = fields as SchedaRicambiFields;
        const scarico = await applyCaptureRicambiScarichiAfterImport({
          fields: ricFields,
          lavorazioneId: result.lavorazioneId,
          identLine: ricFields.identificazioneMacchina.trim() || "scheda ricambi",
          autore: "Operatore",
          qc,
        });
        if (scarico.applied > 0) {
          gestToast.success(`Scarico magazzino: ${scarico.applied} riga/e`);
        }
        if (scarico.failed.length > 0) {
          gestToast.error(
            `Scarico non riuscito per: ${scarico.failed.map((f) => f.label).join(", ")}`,
            { module: "magazzino" },
          );
        }
      }
      setStatus("ready");
      onApplySuccess?.(result.lavorazioneId);
    } catch (err) {
      if (err instanceof Error && err.message === "REVIEW_REQUIRED") {
        setStatus("editing");
        gestToast.validation(
          "Alcuni campi richiedono revisione prima dell'import. Controlla i messaggi evidenziati.",
        );
        return;
      }
      setStatus("dirty");
      onCompileError?.(err instanceof Error ? err.message : "Apply non riuscito");
    } finally {
      submittingRef.current = false;
    }
  }, [
    applyFlow,
    assignLavorazioneId,
    captureId,
    fields,
    gestToast,
    onApplySuccess,
    onCompileError,
    qc,
    setStatus,
    tipo,
  ]);

  const submitBusy = applyFlow.busy || compileStatus === "applying";
  useEffect(() => {
    onSubmitBusyChange?.(submitBusy);
    return () => onSubmitBusyChange?.(false);
  }, [onSubmitBusyChange, submitBusy]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!fields || compileStatus !== "ready" || submittingRef.current) return;

      if (tipo === "lavorazioni") {
        const missingDateIdx = (fields as SchedaLavorazioniFields).righe.findIndex(
          (row) => row.lavorazioniEffettuate.trim() && !row.dataLavorazione.trim(),
        );
        if (missingDateIdx >= 0) {
          const rowNum = missingDateIdx + 1;
          const dataKey = `riga_${rowNum}_data`;
          const hint = rowHintsRef.current[dataKey];
          gestToast.validation(
            hint?.message ?? `Data riga ${rowNum} non letta dalla scansione.`,
          );
          document.querySelector(`[data-capture-hint="${dataKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      } else {
        const missingDateIdx = (fields as SchedaRicambiFields).righe.findIndex(
          (row) =>
            (row.ricambioNome.trim() || row.codice.trim() || row.addetto.trim() || row.quantita > 0) &&
            !row.dataUtilizzo.trim(),
        );
        if (missingDateIdx >= 0) {
          const rowNum = missingDateIdx + 1;
          const dataKey = `riga_${rowNum}_data`;
          const hint = rowHintsRef.current[dataKey];
          gestToast.validation(
            hint?.message ?? `Data riga ${rowNum} non letta dalla scansione.`,
          );
          document.querySelector(`[data-capture-hint="${dataKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }

      const linkedLavorazioneId = assignLavorazioneId?.trim();
      if (
        linkedLavorazioneId &&
        lavorazioneHasExistingScheda(schedeStore, linkedLavorazioneId, tipo)
      ) {
        pendingApplyRef.current = () => executeApply();
        setExistingSchedaPromptOpen(true);
        return;
      }

      void executeApply();
    },
    [assignLavorazioneId, compileStatus, executeApply, fields, gestToast, schedeStore, tipo],
  );

  if (compileStatus === "loading" || !sharedGlobalOpts || !fields) {
    return (
      <CaptureReviewSplitLayout
        preview={
          <CaptureReviewPanelLoading title="Anteprima documento" message="Caricamento anteprima…" skeleton="preview" />
        }
        review={<CaptureReviewPanelLoading title="Scheda" message="Preparazione campi…" skeleton="fields" />}
      />
    );
  }

  if (loadError) {
    return <p className="text-sm text-[color:var(--cab-danger)]">{loadError}</p>;
  }

  const validationPanel = applyFlow.validation ? (
    <CaptureValidationIssuesBanner validation={applyFlow.validation} />
  ) : null;

  return (
    <>
      <CaptureReviewSplitLayout
      preview={<CaptureSheetCompilePreview captureId={captureId} />}
      busyOverlay={
        submitBusy ? (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg bg-[color:var(--cab-bg)]/80 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <LoadingSpinner size="md" />
          </div>
        ) : null
      }
      review={
        <form id={CAPTURE_SHEET_COMPILE_FORM_ID} onSubmit={handleSubmit} className="min-w-0 space-y-3">
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
              variant="capture"
              captureIdentParts={captureIdentParts}
            />
          ) : (
            <SchedaRicambiFormBody
              value={fields as SchedaRicambiFields}
              onChange={handleFieldsChange}
              globalOpts={{ addettiLista, magazzino }}
              rowHints={rowHints}
              reviewCount={reviewCount}
              variant="capture"
              captureIdentParts={captureIdentParts}
            />
          )}
        </form>
      }
    />
      <CaptureExistingSchedaConfirmDialog
        open={existingSchedaPromptOpen}
        schedaTipo={tipo}
        targetLabel={existingSchedaTargetLabel}
        onBack={() => {
          pendingApplyRef.current = null;
          setExistingSchedaPromptOpen(false);
        }}
        onViewExisting={() => {
          const lavId = assignLavorazioneId?.trim();
          pendingApplyRef.current = null;
          setExistingSchedaPromptOpen(false);
          if (!lavId || !onViewExistingScheda) return;
          void onViewExistingScheda(lavId, tipo);
        }}
        onOverwrite={() => {
          setExistingSchedaPromptOpen(false);
          const run = pendingApplyRef.current;
          pendingApplyRef.current = null;
          void run?.();
        }}
      />
    </>
  );
}

export function isSheetCompileImportEnabled(status: CompileStatus): boolean {
  return status === "ready";
}

export { captureReviewAllowsForceApply };
