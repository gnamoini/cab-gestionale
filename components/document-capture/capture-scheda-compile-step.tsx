"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { CaptureReviewPanelLoading, CaptureReviewSplitLayout } from "@/components/document-capture/capture-review-panel";
import {
  SchedaIngressoFormBody,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import {
  buildCaptureIngressoCompileData,
  countCaptureHintsNeedingReview,
  reconcileCaptureIngressoHintAfterEdit,
  type CaptureIngressoCompileData,
  type CaptureIngressoFieldHint,
} from "@/lib/document-capture/capture-ingresso-field-hints";
import type { CaptureCatalogValidationInput } from "@/lib/document-capture/capture-catalog-validation";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { CaptureIngressoCompileDraft } from "@/lib/document-capture/capture-acquisition-draft";
import { mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields, SchedaTipo } from "@/types/schede";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { useLavorazioneCreateSubmit } from "@/src/hooks/use-lavorazione-create-submit";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { LoadingSpinner } from "@/components/design-system/loading";
import { CaptureApplyRecoveryBanner } from "@/components/document-capture/capture-apply-recovery-banner";
import { CaptureApplyReviewBanner } from "@/components/document-capture/capture-apply-review-banner";
import { CaptureExistingSchedaConfirmDialog } from "@/components/document-capture/capture-existing-scheda-confirm-dialog";
import { describeCaptureLavorazioneAssignTarget } from "@/lib/document-capture/capture-lavorazione-match";
import { lavorazioneHasExistingScheda } from "@/lib/document-capture/capture-existing-scheda-presence";
import { useCaptureApplyFlow } from "@/lib/document-capture/use-capture-apply-flow";
import type { ValidateCaptureResult } from "@/lib/document-capture/validation/validate-capture-for-apply";

export const CAPTURE_COMPILE_FORM_ID = "capture-scheda-compile-form";

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
          : "Revisione consigliata prima del salvataggio"}
      </p>
      <ul className="mt-1 list-disc pl-4 text-xs">
        {validation.issues.map((issue) => (
          <li key={`${issue.code}-${issue.fieldKey ?? ""}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

const HINT_RECONCILE_MS = 250;
const COMPILE_DRAFT_DEBOUNCE_MS = 400;

/** Anteprima isolata — evita reload iframe PDF a ogni keystroke del form. */
const CaptureCompileDocumentPreview = memo(function CaptureCompileDocumentPreview({
  captureId,
}: {
  captureId: string;
}) {
  return <CaptureDocumentFilePreview captureId={captureId} pinned />;
});

export function CaptureSchedaCompileStep({
  captureId,
  fieldRows,
  createdBy,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
  sharedGlobalOpts,
  sharedMezziCatalog,
  magazzino = [],
  onCreated,
  onCompileError,
  applyMode = false,
  assignLavorazioneId = null,
  onApplySuccess,
  onViewExistingScheda,
  resumeIngressoCompile = null,
  onIngressoCompileChange,
  onSubmitBusyChange,
}: {
  captureId: string;
  fieldRows: readonly CaptureFieldRow[];
  createdBy: string | null;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  sharedGlobalOpts?: GlobalOptionsSlice;
  sharedMezziCatalog?: readonly MezzoGestito[];
  magazzino?: readonly RicambioMagazzino[];
  onCreated?: (id: string) => void;
  onCompileError?: (message: string) => void;
  /** Single Apply Engine — dry-run → apply invece di create diretto. */
  applyMode?: boolean;
  assignLavorazioneId?: string | null;
  onApplySuccess?: (lavorazioneId: string) => void;
  onViewExistingScheda?: (lavorazioneId: string, schedaTipo: SchedaTipo) => void | Promise<boolean>;
  resumeIngressoCompile?: CaptureIngressoCompileDraft | null;
  onIngressoCompileChange?: (snapshot: CaptureIngressoCompileDraft) => void;
  onSubmitBusyChange?: (busy: boolean) => void;
}) {
  const [compileData, setCompileData] = useState<CaptureIngressoCompileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [captureHints, setCaptureHints] = useState<
    Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>
  >({});
  const [existingSchedaPromptOpen, setExistingSchedaPromptOpen] = useState(false);
  const pendingApplyRef = useRef<(() => Promise<void>) | null>(null);

  const applyFlow = useCaptureApplyFlow(applyMode ? captureId : null);
  const gestToast = useGestionaleToast();

  const initialCompileFields = useMemo(() => {
    if (!compileData?.fields) return null;
    if (!resumeIngressoCompile?.fields) return compileData.fields;
    let fields = mergeSchedaIngressoFields(compileData.fields, resumeIngressoCompile.fields, {
      copySignatures: true,
    });
    const resumeDate = resumeIngressoCompile.fields.dataIngresso.trim();
    if (resumeDate) fields = { ...fields, dataIngresso: resumeDate };
    return fields;
  }, [compileData?.fields, resumeIngressoCompile]);

  const initialCompileMeta = useMemo(() => {
    if (!resumeIngressoCompile?.meta) return undefined;
    return {
      stato: resumeIngressoCompile.meta.stato,
      priorita: resumeIngressoCompile.meta.priorita as PrioritaLav,
      mezzoId: resumeIngressoCompile.meta.mezzoId,
    };
  }, [resumeIngressoCompile]);

  const create = useLavorazioneCreateSubmit({
    enabled: Boolean(compileData) && !loading,
    createdBy,
    initialFields: initialCompileFields,
    initialMeta: initialCompileMeta,
    mezzi,
    schedeStore,
    attive,
    storico,
    sharedGlobalOpts,
    sharedMezziCatalog,
    onCreated,
  });

  const createFieldsRef = useRef(create.fields);
  createFieldsRef.current = create.fields;
  const createMetaRef = useRef({
    stato: create.stato,
    priorita: create.priorita,
    mezzoId: create.mezzoId,
  });
  createMetaRef.current = {
    stato: create.stato,
    priorita: create.priorita,
    mezzoId: create.mezzoId,
  };
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const submitBusy = applyMode ? applyFlow.busy : create.pending;

  useEffect(() => {
    onSubmitBusyChange?.(submitBusy);
    return () => onSubmitBusyChange?.(false);
  }, [onSubmitBusyChange, submitBusy]);

  useEffect(() => {
    if (!sharedGlobalOpts || sharedGlobalOpts.isLoading) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void buildCaptureIngressoCompileData({
      captureId,
      fieldRows,
      sharedGlobalOpts,
      magazzino,
      mezzi,
    })
      .then((data) => {
        if (cancelled) return;
        setCompileData(data);
        setCaptureHints(data.hints);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Impossibile preparare la scheda";
        setLoadError(msg);
        onCompileError?.(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [captureId, fieldRows, magazzino, mezzi, onCompileError, sharedGlobalOpts]);

  useEffect(() => {
    if (!onIngressoCompileChange || loading || !compileData) return;
    const timer = window.setTimeout(() => {
      onIngressoCompileChange({
        fields: create.fields,
        meta: {
          stato: create.stato,
          priorita: create.priorita,
          mezzoId: create.mezzoId,
        },
      });
    }, COMPILE_DRAFT_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      if (!onIngressoCompileChange || loadingRef.current || !compileData) return;
      onIngressoCompileChange({
        fields: createFieldsRef.current,
        meta: createMetaRef.current,
      });
    };
  }, [
    compileData,
    create.fields,
    create.mezzoId,
    create.priorita,
    create.stato,
    loading,
    onIngressoCompileChange,
  ]);

  const reviewCount = useMemo(() => countCaptureHintsNeedingReview(captureHints), [captureHints]);

  const catalogValidationInput = useMemo((): CaptureCatalogValidationInput | null => {
    if (!sharedGlobalOpts || sharedGlobalOpts.isLoading) return null;
    return {
      fields: [],
      addettiRecords: sharedGlobalOpts.lavorazioni.addettiRecords ?? [],
      mezziListe: sharedGlobalOpts.mezziListe,
      magazzino: magazzino ?? [],
    };
  }, [magazzino, sharedGlobalOpts]);

  const patchFieldsRef = useRef(create.patch);
  patchFieldsRef.current = create.patch;
  const fieldsRef = useRef(create.fields);
  fieldsRef.current = create.fields;
  const catalogValidationInputRef = useRef(catalogValidationInput);
  catalogValidationInputRef.current = catalogValidationInput;
  const captureHintsRef = useRef(captureHints);
  captureHintsRef.current = captureHints;
  const hintReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHintKeysRef = useRef(new Set<keyof SchedaIngressoFields>());

  useEffect(
    () => () => {
      if (hintReconcileTimerRef.current) clearTimeout(hintReconcileTimerRef.current);
    },
    [],
  );

  const flushHintReconcile = useCallback(() => {
    hintReconcileTimerRef.current = null;
    const catalogInput = catalogValidationInputRef.current;
    if (!catalogInput || pendingHintKeysRef.current.size === 0) return;
    const keys = [...pendingHintKeysRef.current];
    pendingHintKeysRef.current.clear();
    const currentFields = fieldsRef.current;
    setCaptureHints((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const rawKey of keys) {
        const hint = prev[rawKey];
        if (!hint) continue;
        const reconciled = reconcileCaptureIngressoHintAfterEdit(
          rawKey,
          String(currentFields[rawKey] ?? ""),
          hint,
          catalogInput,
        );
        if (reconciled) next[rawKey] = reconciled;
        else delete next[rawKey];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const onPatchCaptureAware = useCallback((patch: Partial<SchedaIngressoFields>) => {
    patchFieldsRef.current(patch);
    if (!catalogValidationInputRef.current) return;
    const hints = captureHintsRef.current;
    for (const rawKey of Object.keys(patch) as Array<keyof SchedaIngressoFields>) {
      if (patch[rawKey] === undefined || !hints[rawKey]) continue;
      pendingHintKeysRef.current.add(rawKey);
    }
    if (pendingHintKeysRef.current.size === 0) return;
    if (hintReconcileTimerRef.current) clearTimeout(hintReconcileTimerRef.current);
    hintReconcileTimerRef.current = setTimeout(flushHintReconcile, HINT_RECONCILE_MS);
  }, [flushHintReconcile]);

  const onApplyCaptureHint = useCallback((key: keyof SchedaIngressoFields, value: string) => {
    patchFieldsRef.current({ [key]: value } as Partial<SchedaIngressoFields>);
    if (hintReconcileTimerRef.current) clearTimeout(hintReconcileTimerRef.current);
    pendingHintKeysRef.current.delete(key);
    setCaptureHints((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validationPanel =
    applyMode && applyFlow.validation ? (
      <CaptureValidationIssuesBanner validation={applyFlow.validation} />
    ) : null;

  const applyFromIngressoWithGate = useCallback(
    async (opts?: { forceReview?: boolean }) => {
      let mezzoUpdatePlan: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
      try {
        mezzoUpdatePlan = await create.gateSave(fieldsRef.current);
      } catch (gateErr) {
        if (gateErr instanceof Error && gateErr.message === "SAVE_CANCELLED") return;
        throw gateErr;
      }
      const result = await applyFlow.applyFromIngresso(fieldsRef.current, {
        forceReview: opts?.forceReview,
        meta: {
          priorita: create.priorita,
          statoId: create.stato,
          writeContext: { source: "import_ai", mezzoUpdatePlan },
        },
      });
      onApplySuccess?.(result.lavorazioneId);
    },
    [applyFlow, create.gateSave, create.priorita, create.stato, onApplySuccess],
  );

  const requestIngressoApply = useCallback(
    (opts?: { forceReview?: boolean }) => {
      const linkedLavorazioneId = assignLavorazioneId?.trim();
      const run = async () => {
        try {
          await applyFromIngressoWithGate(opts);
        } catch (err) {
          if (err instanceof Error && err.message === "REVIEW_REQUIRED") return;
          onCompileError?.(err instanceof Error ? err.message : "Apply non riuscito");
        }
      };
      if (
        linkedLavorazioneId &&
        lavorazioneHasExistingScheda(schedeStore, linkedLavorazioneId, "ingresso")
      ) {
        pendingApplyRef.current = run;
        setExistingSchedaPromptOpen(true);
        return;
      }
      void run();
    },
    [applyFromIngressoWithGate, assignLavorazioneId, onCompileError, schedeStore],
  );

  const existingSchedaTargetLabel = useMemo(() => {
    const lavId = assignLavorazioneId?.trim();
    if (!lavId) return "";
    return describeCaptureLavorazioneAssignTarget(lavId, attive, schedeStore);
  }, [assignLavorazioneId, attive, schedeStore]);

  const handleSubmitAttempt = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (!compileData) return;
      if (captureHints.dataIngresso) {
        e.preventDefault();
        gestToast.validation("Data ingresso non letta dalla scansione — inserirla manualmente.");
        document
          .querySelector('[data-capture-hint="dataIngresso"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (applyMode) {
        e.preventDefault();
        requestIngressoApply();
        return;
      }
      void create.onSubmit(e);
    },
    [applyMode, captureHints, compileData, create, gestToast, onCompileError, requestIngressoApply],
  );

  if (loading || !sharedGlobalOpts) {
    return (
      <CaptureReviewSplitLayout
        preview={
          <CaptureReviewPanelLoading title="Anteprima documento" message="Caricamento anteprima…" skeleton="preview" />
        }
        review={<CaptureReviewPanelLoading title="Scheda ingresso" message="Preparazione campi…" skeleton="fields" />}
      />
    );
  }

  if (loadError) {
    return <p className="text-sm text-[color:var(--cab-danger)]">{loadError}</p>;
  }

  return (
    <>
      <CaptureReviewSplitLayout
        preview={<CaptureCompileDocumentPreview captureId={captureId} />}
        busyOverlay={
          submitBusy ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg bg-[color:var(--cab-bg)]/80 backdrop-blur-[1px]"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <LoadingSpinner size="md" />
              <p className="text-sm font-medium text-[color:var(--cab-fg)]">
                {applyMode ? "Import in corso…" : "Salvataggio in corso…"}
              </p>
            </div>
          ) : null
        }
        review={
          <form
            ref={create.formRef}
            id={CAPTURE_COMPILE_FORM_ID}
            {...create.formProps}
            onSubmit={handleSubmitAttempt}
            className="min-w-0 space-y-3"
          >
            {applyMode ? (
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
            ) : null}
            {validationPanel}
            <CaptureApplyReviewBanner
              validation={applyFlow.validation}
              busy={applyFlow.busy}
              onForceReview={() => {
                requestIngressoApply({ forceReview: true });
              }}
            />
            {applyMode && applyFlow.error ? (
              <div
                role="alert"
                className="mb-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {applyFlow.error}
              </div>
            ) : null}
            {!applyMode && create.schedaSyncError ? (
              <div
                role="alert"
                className="mb-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {create.schedaSyncError}
              </div>
            ) : null}
            <SchedaIngressoFormBody
              variant="create-lavorazione"
              fields={create.fields}
              setFields={create.setFields}
              onPatch={onPatchCaptureAware}
              pending={submitBusy}
              mezzi={mezzi}
              schedeStore={schedeStore}
              attive={attive}
              storico={storico}
              stato={create.stato}
              onStatoChange={create.setStato}
              priorita={create.priorita}
              onPrioritaChange={create.setPriorita}
              mezzoHint={create.mezzoHint}
              errorMessage={create.inlineError}
              mezzoPrompt={create.mezzoPrompt}
              mezzoLinked={Boolean(create.mezzoId.trim()) || create.mezzoPrompt.linkState.status === "linked"}
              mezzoId={create.mezzoId || create.mezzoPrompt.preferredMezzoId || ""}
              sharedGlobalOpts={create.globalOpts}
              sharedMezziCatalog={create.mezziCatalog}
              captureHints={captureHints}
              onApplyCaptureHint={onApplyCaptureHint}
              captureReviewCount={reviewCount}
              embedInParentScroll
            />
          </form>
        }
      />
      {create.unknownSettingsDialog}
      {create.saveGateDialog}
      <CaptureExistingSchedaConfirmDialog
        open={existingSchedaPromptOpen}
        schedaTipo="ingresso"
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
          void onViewExistingScheda(lavId, "ingresso");
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
