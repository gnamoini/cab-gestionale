"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { CaptureReviewPanelLoading, CaptureReviewSplitLayout } from "@/components/document-capture/capture-review-panel";
import {
  deriveCaptureCompileProgress,
  type CaptureCompileLoadPhase,
} from "@/lib/document-capture/capture-compile-progress";
import {
  SchedaIngressoFormBody,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import {
  buildCaptureIngressoCompileDataFast,
  buildCaptureIngressoCompileHints,
  countCaptureHintsNeedingReview,
  reconcileCaptureIngressoHintAfterEdit,
  type CaptureIngressoCompileData,
  type CaptureIngressoFieldHint,
} from "@/lib/document-capture/capture-ingresso-field-hints";
import type { CaptureCatalogValidationInput } from "@/lib/document-capture/capture-catalog-validation";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { CaptureIngressoCompileDraft } from "@/lib/document-capture/capture-acquisition-draft";
import { mergeCaptureCompileFieldsRespectingDirty, markCaptureCompileFieldDirty, type CaptureCompileFieldDirtyMap } from "@/lib/document-capture/capture-compile-field-dirty";
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
import { CaptureMezzoCandidatePanel } from "@/components/document-capture/capture-mezzo-candidate-panel";
import { CaptureMezzoFieldConflictHints } from "@/components/document-capture/capture-mezzo-field-conflict-hint";
import { CaptureMezzoRegistryConfirmDialog } from "@/components/document-capture/capture-mezzo-registry-confirm-dialog";
import { applyCaptureConflictResolutions } from "@/lib/document-capture/apply-capture-conflict-resolutions";
import type { CaptureMezzoMatchCandidate } from "@/lib/document-capture/capture-mezzo-catalog-match";
import {
  deriveMezzoMatchStateFromMerge,
  initialMezzoMatchStateFromResolution,
  shouldResetMezzoMatchOnResume,
  type CaptureConflictResolution,
  type CaptureMezzoMatchState,
} from "@/lib/document-capture/capture-mezzo-match-state";
import { traceCaptureMezzoMatchResult } from "@/lib/document-capture/capture-mezzo-match-telemetry";
import {
  buildMezzoRegistryUpdatePlan,
  registryFieldsAlreadyDecided,
  type MezzoRegistryUpdatePlan,
} from "@/lib/document-capture/capture-mezzo-registry-update-plan";
import { mergeCaptureIngressoWithLinkedMezzo } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";
import {
  resolveCaptureIngressoContext,
  type CaptureIngressoContextResolution,
} from "@/lib/document-capture/resolve-capture-ingresso-context";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { SelectedMezzoContext } from "@/lib/lavorazioni/selected-mezzo-context";
import type { ValidateCaptureResult } from "@/lib/document-capture/validation/validate-capture-for-apply";
import type { CaptureIngressoMergeResult } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";

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
  const [loadPhase, setLoadPhase] = useState<CaptureCompileLoadPhase>("settings");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [captureHints, setCaptureHints] = useState<
    Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>
  >({});
  const [existingSchedaPromptOpen, setExistingSchedaPromptOpen] = useState(false);
  const [ingressoContext, setIngressoContext] = useState<CaptureIngressoContextResolution | null>(null);
  const [matchState, setMatchState] = useState<CaptureMezzoMatchState>("not_checked");
  const [selectedCandidate, setSelectedCandidate] = useState<CaptureMezzoMatchCandidate | null>(null);
  const [mergeResult, setMergeResult] = useState<CaptureIngressoMergeResult | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<
    Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>>
  >({});
  const [registryDialogOpen, setRegistryDialogOpen] = useState(false);
  const [pendingRegistryPlan, setPendingRegistryPlan] = useState<MezzoRegistryUpdatePlan | null>(null);
  const scannedFieldsRef = useRef<SchedaIngressoFields | null>(null);
  const lastContextKeyRef = useRef<string | null>(null);
  const fieldDirtyRef = useRef<CaptureCompileFieldDirtyMap>({});
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

  const initialCompileTagliandoFields = useMemo(() => {
    if (!compileData?.tagliandoFields) return undefined;
    if (!resumeIngressoCompile?.tagliandoFields) return compileData.tagliandoFields;
    return { ...compileData.tagliandoFields, ...resumeIngressoCompile.tagliandoFields };
  }, [compileData?.tagliandoFields, resumeIngressoCompile?.tagliandoFields]);

  const create = useLavorazioneCreateSubmit({
    enabled: Boolean(compileData) && !loading,
    createdBy,
    initialFields: initialCompileFields,
    initialTagliandoFields: initialCompileTagliandoFields,
    initialMeta: initialCompileMeta,
    mezzi,
    schedeStore,
    attive,
    storico,
    sharedGlobalOpts,
    sharedMezziCatalog,
    onCreated,
  });

  const mezziCatalog = create.mezziCatalog;

  const applyCandidatePreview = useCallback(
    (
      candidate: CaptureMezzoMatchCandidate,
      scanned: SchedaIngressoFields,
      resolutions: Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>> = {},
    ) => {
      const merged = mergeCaptureIngressoWithLinkedMezzo({
        scannedFields: scanned,
        linkedMezzo: candidate.mezzo,
      });
      setMergeResult(merged);
      setConflictResolutions(resolutions);
      const nextState = deriveMezzoMatchStateFromMerge(
        "candidate_found",
        merged.conflicts,
        resolutions,
      );
      setMatchState(nextState);
      const finalFields = applyCaptureConflictResolutions({
        mergeResult: merged,
        conflictResolutions: resolutions,
      });
      create.setFields(finalFields);
    },
    [create],
  );

  useEffect(() => {
    if (!compileData?.fields) return;

    const catalog = mezziCatalog.length > 0 ? mezziCatalog : mezzi;
    const contextKey = `${captureId}:${fieldRows.length}:${catalog.length}`;
    if (lastContextKeyRef.current === contextKey && ingressoContext) return;

    const context = resolveCaptureIngressoContext({
      captureFields: fieldRows,
      mezziCatalog: catalog,
      attive,
      schedeStore,
    });
    setIngressoContext(context);
    scannedFieldsRef.current = compileData.fields;

    const resume = resumeIngressoCompile?.mezzoMatch;
    if (
      resume &&
      shouldResetMezzoMatchOnResume({
        storedReasonsHash: resume.selectedCandidateReasonsHash,
        currentReasonsHash: context.mezzo.reasonsHash,
        state: resume.state,
      })
    ) {
      setMatchState("candidate_found");
      setSelectedCandidate(
        context.mezzo.candidates.find((c) => c.mezzo.id === resume.linkedMezzoId) ??
          context.mezzo.recommendedMatch,
      );
    } else if (resume?.state) {
      setMatchState(resume.state);
      if (resume.linkedMezzoId) {
        const candidate = context.mezzo.candidates.find((c) => c.mezzo.id === resume.linkedMezzoId);
        if (candidate) {
          setSelectedCandidate(candidate);
          applyCandidatePreview(
            candidate,
            compileData.fields,
            resume.conflictResolutions ?? {},
          );
        }
      }
    } else {
      const initial = initialMezzoMatchStateFromResolution({
        decision: context.mezzo.decision,
      });
      setMatchState(initial);
      if (context.mezzo.recommendedMatch && context.mezzo.decision === "auto_suggest") {
        setSelectedCandidate(context.mezzo.recommendedMatch);
        applyCandidatePreview(context.mezzo.recommendedMatch, compileData.fields);
      }
    }

    traceCaptureMezzoMatchResult({
      confidence: context.mezzo.confidence,
      matchStrength: context.mezzo.matchStrength,
      candidateCount: context.mezzo.candidates.length,
      confirmed: false,
      dismissed: false,
      forceNewMezzo: false,
      conflictsCount: 0,
      priority: context.priority,
    });

    lastContextKeyRef.current = contextKey;
  }, [
    applyCandidatePreview,
    attive,
    captureId,
    compileData?.fields,
    fieldRows.length,
    ingressoContext,
    mezzi,
    mezziCatalog,
    resumeIngressoCompile?.mezzoMatch,
    schedeStore,
  ]);

  const handleSelectCandidate = useCallback(
    (candidate: CaptureMezzoMatchCandidate) => {
      setSelectedCandidate(candidate);
      if (scannedFieldsRef.current) {
        applyCandidatePreview(candidate, scannedFieldsRef.current);
      }
    },
    [applyCandidatePreview],
  );

  const handleResolveConflict = useCallback(
    (field: MezzoPermanentFieldKey, resolution: CaptureConflictResolution) => {
      setConflictResolutions((prev) => {
        const next = { ...prev, [field]: resolution };
        if (mergeResult && scannedFieldsRef.current) {
          const finalFields = applyCaptureConflictResolutions({
            mergeResult,
            conflictResolutions: next,
          });
          create.setFields(finalFields);
          setMatchState(
            deriveMezzoMatchStateFromMerge(matchState, mergeResult.conflicts, next),
          );
        }
        return next;
      });
    },
    [create, matchState, mergeResult],
  );

  const finalizeMezzoLink = useCallback(
    (registryPlan: MezzoRegistryUpdatePlan | null) => {
      if (!selectedCandidate || !mergeResult) return;
      const finalFields = applyCaptureConflictResolutions({
        mergeResult,
        conflictResolutions,
      });
      const skipFields = registryFieldsAlreadyDecided(registryPlan, conflictResolutions);
      create.applyMezzoFromCapture({
        mezzo: selectedCandidate.mezzo,
        finalFields,
        skipSaveGateFields: skipFields,
      });
      setMatchState("confirmed");
      setRegistryDialogOpen(false);
      traceCaptureMezzoMatchResult({
        confidence: ingressoContext?.mezzo.confidence ?? 0,
        matchStrength: selectedCandidate.matchStrength,
        candidateCount: ingressoContext?.mezzo.candidates.length ?? 0,
        confirmed: true,
        dismissed: false,
        forceNewMezzo: false,
        conflictsCount: mergeResult.conflicts.length,
        priority: ingressoContext?.priority ?? "new_entry",
      });
    },
    [conflictResolutions, create, ingressoContext, mergeResult, selectedCandidate],
  );

  const handleConfirmMezzo = useCallback(() => {
    if (!selectedCandidate || !mergeResult) return;
    const plan = buildMezzoRegistryUpdatePlan({
      mezzoId: selectedCandidate.mezzo.id,
      mergeResult,
    });
    if (plan.fieldsToUpdate.length > 0) {
      setPendingRegistryPlan(plan);
      setRegistryDialogOpen(true);
      return;
    }
    finalizeMezzoLink(null);
  }, [finalizeMezzoLink, mergeResult, selectedCandidate]);

  const handleForceNewMezzo = useCallback(() => {
    if (scannedFieldsRef.current) {
      create.clearCaptureMezzoLink(scannedFieldsRef.current);
    }
    setSelectedCandidate(null);
    setMergeResult(null);
    setConflictResolutions({});
    setMatchState("force_new_mezzo");
    traceCaptureMezzoMatchResult({
      confidence: ingressoContext?.mezzo.confidence ?? 0,
      matchStrength: ingressoContext?.mezzo.matchStrength ?? "none",
      candidateCount: ingressoContext?.mezzo.candidates.length ?? 0,
      confirmed: false,
      dismissed: false,
      forceNewMezzo: true,
      conflictsCount: mergeResult?.conflicts.length ?? 0,
      priority: ingressoContext?.priority ?? "new_entry",
    });
  }, [create, ingressoContext, mergeResult]);

  const handleDismissMatch = useCallback(() => {
    if (scannedFieldsRef.current) {
      create.clearCaptureMezzoLink(scannedFieldsRef.current);
    }
    setSelectedCandidate(null);
    setMergeResult(null);
    setConflictResolutions({});
    setMatchState("dismissed");
    traceCaptureMezzoMatchResult({
      confidence: ingressoContext?.mezzo.confidence ?? 0,
      matchStrength: ingressoContext?.mezzo.matchStrength ?? "none",
      candidateCount: ingressoContext?.mezzo.candidates.length ?? 0,
      confirmed: false,
      dismissed: true,
      forceNewMezzo: false,
      conflictsCount: 0,
      priority: ingressoContext?.priority ?? "new_entry",
    });
  }, [create, ingressoContext]);

  const handleManualSelect = useCallback(
    (ctx: SelectedMezzoContext) => {
      if (ctx.mode !== "existing") {
        handleForceNewMezzo();
        return;
      }
      const mezzo = mezziCatalog.find((m) => m.id === ctx.mezzoId);
      if (!mezzo || !scannedFieldsRef.current) return;
      const candidate =
        ingressoContext?.mezzo.candidates.find((c) => c.mezzo.id === mezzo.id) ?? {
          mezzo,
          score: 0,
          percentage: 0,
          matchStrength: "weak" as const,
          reasons: [],
        };
      setSelectedCandidate(candidate);
      applyCandidatePreview(candidate, scannedFieldsRef.current);
      setMatchState("manual_selected");
    },
    [applyCandidatePreview, handleForceNewMezzo, ingressoContext, mezziCatalog],
  );

  const createFieldsRef = useRef(create.fields);
  createFieldsRef.current = create.fields;
  const createTagliandoFieldsRef = useRef(create.tagliandoFields);
  createTagliandoFieldsRef.current = create.tagliandoFields;
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
    if (!sharedGlobalOpts || sharedGlobalOpts.isLoading) {
      setLoadPhase("settings");
      return;
    }
    let cancelled = false;
    setLoadError(null);
    fieldDirtyRef.current = {};
    setLoading(true);
    setLoadPhase("map_fields");

    const fast = buildCaptureIngressoCompileDataFast({
      fieldRows,
      sharedGlobalOpts,
    });
    setCompileData({
      ...fast,
      hints: {},
      ambiguousCaptureKeys: [],
      reviewCount: 0,
    });
    setCaptureHints({});
    setLoadPhase("field_hints");

    void buildCaptureIngressoCompileHints({
      fieldRows: fast.fieldRows,
      fields: fast.fields,
      sharedGlobalOpts,
      magazzino,
    })
      .then((slow) => {
        if (cancelled) return;
        setCaptureHints(slow.hints);
        setCompileData((prev) => {
          if (!prev) return prev;
          const mergedFields = mergeCaptureCompileFieldsRespectingDirty({
            current: prev.fields,
            incoming: fast.fields,
            dirty: fieldDirtyRef.current,
          });
          return {
            ...prev,
            fields: mergedFields,
            hints: slow.hints,
            ambiguousCaptureKeys: slow.ambiguousCaptureKeys,
            reviewCount: slow.reviewCount,
          };
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Impossibile preparare la scheda";
        setLoadError(msg);
        onCompileError?.(msg);
        setLoading(false);
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
        tagliandoFields: create.tagliandoFields,
        meta: {
          stato: create.stato,
          priorita: create.priorita,
          mezzoId: create.mezzoId,
        },
        mezzoMatch: {
          state: matchState,
          linkedMezzoId: (selectedCandidate?.mezzo.id ?? create.mezzoId) || null,
          recommendedMezzoId: ingressoContext?.mezzo.recommendedMatch?.mezzo.id ?? null,
          selectedCandidateScore: selectedCandidate?.score,
          selectedCandidateReasonsHash: ingressoContext?.mezzo.reasonsHash,
          conflictResolutions,
          registryUpdatePlan: pendingRegistryPlan,
        },
      });
    }, COMPILE_DRAFT_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      if (!onIngressoCompileChange || loadingRef.current || !compileData) return;
      onIngressoCompileChange({
        fields: createFieldsRef.current,
        tagliandoFields: createTagliandoFieldsRef.current,
        meta: createMetaRef.current,
        mezzoMatch: {
          state: matchState,
          linkedMezzoId: (selectedCandidate?.mezzo.id ?? createMetaRef.current.mezzoId) || null,
          recommendedMezzoId: ingressoContext?.mezzo.recommendedMatch?.mezzo.id ?? null,
          selectedCandidateScore: selectedCandidate?.score,
          selectedCandidateReasonsHash: ingressoContext?.mezzo.reasonsHash,
          conflictResolutions,
          registryUpdatePlan: pendingRegistryPlan,
        },
      });
    };
  }, [
    compileData,
    create.fields,
    create.tagliandoFields,
    create.mezzoId,
    create.priorita,
    create.stato,
    conflictResolutions,
    ingressoContext?.mezzo.reasonsHash,
    ingressoContext?.mezzo.recommendedMatch?.mezzo.id,
    loading,
    matchState,
    onIngressoCompileChange,
    pendingRegistryPlan,
    selectedCandidate?.mezzo.id,
    selectedCandidate?.score,
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
    for (const rawKey of Object.keys(patch) as Array<keyof SchedaIngressoFields>) {
      if (patch[rawKey] !== undefined) {
        fieldDirtyRef.current = markCaptureCompileFieldDirty(fieldDirtyRef.current, rawKey);
      }
    }
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
    fieldDirtyRef.current = markCaptureCompileFieldDirty(fieldDirtyRef.current, key);
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

  const compileLoadProgress = useMemo(() => {
    if (!sharedGlobalOpts || sharedGlobalOpts.isLoading) {
      return deriveCaptureCompileProgress("settings");
    }
    if (loading) return deriveCaptureCompileProgress(loadPhase);
    return null;
  }, [sharedGlobalOpts, loading, loadPhase]);

  if (loading || !sharedGlobalOpts) {
    return (
      <CaptureReviewSplitLayout
        preview={
          <CaptureReviewPanelLoading
            title="Anteprima documento"
            message="Caricamento anteprima…"
            skeleton="preview"
            progressState={compileLoadProgress}
          />
        }
        review={
          <CaptureReviewPanelLoading
            title="Scheda ingresso"
            message="Preparazione campi…"
            skeleton="fields"
            progressState={compileLoadProgress}
          />
        }
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
            {ingressoContext ? (
              <CaptureMezzoCandidatePanel
                context={ingressoContext}
                matchState={matchState}
                selectedCandidate={selectedCandidate}
                mergeResult={mergeResult}
                conflictResolutions={conflictResolutions}
                mezziCatalog={mezziCatalog}
                userId={createdBy}
                attive={attive}
                schedeStore={schedeStore}
                onConfirmMezzo={handleConfirmMezzo}
                onForceNewMezzo={handleForceNewMezzo}
                onDismiss={handleDismissMatch}
                onSelectCandidate={handleSelectCandidate}
                onManualSelect={handleManualSelect}
              />
            ) : null}
            {mergeResult && matchState !== "dismissed" && matchState !== "force_new_mezzo" ? (
              <CaptureMezzoFieldConflictHints
                mergeResult={mergeResult}
                conflictResolutions={conflictResolutions}
                onResolve={handleResolveConflict}
              />
            ) : null}
            <SchedaIngressoFormBody
              variant="create-lavorazione"
              fields={create.fields}
              setFields={(fields) => {
                const prev = create.fields;
                for (const rawKey of Object.keys(fields) as Array<keyof SchedaIngressoFields>) {
                  if (fields[rawKey] !== prev[rawKey]) {
                    fieldDirtyRef.current = markCaptureCompileFieldDirty(fieldDirtyRef.current, rawKey);
                  }
                }
                create.setFields(fields);
              }}
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
              tagliandoFields={create.tagliandoFields}
              onTagliandoFieldsChange={(patch) =>
                create.setTagliandoFields((prev) => ({ ...prev, ...patch }))
              }
            />
          </form>
        }
      />
      {create.unknownSettingsDialog}
      {create.saveGateDialog}
      {selectedCandidate && mergeResult && pendingRegistryPlan ? (
        <CaptureMezzoRegistryConfirmDialog
          open={registryDialogOpen}
          mezzo={selectedCandidate.mezzo}
          plan={pendingRegistryPlan}
          mergeResult={mergeResult}
          onUpdateRegistry={() => finalizeMezzoLink(pendingRegistryPlan)}
          onSchedaOnly={() => finalizeMezzoLink(null)}
          onCancel={() => {
            setRegistryDialogOpen(false);
            setPendingRegistryPlan(null);
          }}
        />
      ) : null}
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
