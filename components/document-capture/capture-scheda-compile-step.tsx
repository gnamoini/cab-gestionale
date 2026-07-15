"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import {
  CaptureIngressoHintsBanner,
} from "@/components/document-capture/capture-ingresso-field-hint";
import { CAPTURE_REVIEW_PIN_TOP_CLASS } from "@/components/document-capture/capture-review-panel";
import { CaptureReviewPanelLoading } from "@/components/document-capture/capture-review-panel";
import {
  CaptureEntityAmbiguityDialog,
  type AmbiguityPick,
} from "@/components/document-capture/capture-entity-ambiguity-dialog";
import {
  SchedaIngressoFormBody,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import {
  buildCaptureIngressoCompileData,
  captureAmbiguousItemsFromCompileData,
  countCaptureHintsNeedingReview,
  type CaptureIngressoCompileData,
  type CaptureIngressoFieldHint,
} from "@/lib/document-capture/capture-ingresso-field-hints";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { useLavorazioneCreateSubmit } from "@/src/hooks/use-lavorazione-create-submit";

export const CAPTURE_COMPILE_FORM_ID = "capture-scheda-compile-form";

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
}) {
  const [compileData, setCompileData] = useState<CaptureIngressoCompileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [captureHints, setCaptureHints] = useState<
    Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>
  >({});
  const [ambiguityOpen, setAmbiguityOpen] = useState(false);
  const [ambiguityItems, setAmbiguityItems] = useState<
    Array<{ fieldKey: string; original: string; resolution: import("@/lib/entity-resolution/entity-resolution-types").EntityResolutionResult }>
  >([]);
  const [ambiguityBusy, setAmbiguityBusy] = useState(false);

  const create = useLavorazioneCreateSubmit({
    enabled: Boolean(compileData) && !loading,
    createdBy,
    initialFields: compileData?.fields ?? null,
    mezzi,
    schedeStore,
    attive,
    storico,
    sharedGlobalOpts,
    sharedMezziCatalog,
    onCreated,
  });

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

  const reviewCount = useMemo(() => countCaptureHintsNeedingReview(captureHints), [captureHints]);

  const onApplyCaptureHint = useCallback(
    (key: keyof SchedaIngressoFields, value: string) => {
      create.patch({ [key]: value } as Partial<SchedaIngressoFields>);
      setCaptureHints((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [create],
  );

  const handleSubmitAttempt = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (!compileData) return;
      const ambiguous = captureAmbiguousItemsFromCompileData({
        ...compileData,
        hints: captureHints,
      });
      if (ambiguous.length > 0) {
        e.preventDefault();
        setAmbiguityItems(ambiguous);
        setAmbiguityOpen(true);
        const first = document.querySelector(`[data-capture-hint]`);
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      void create.onSubmit(e);
    },
    [captureHints, compileData, create],
  );

  const confirmAmbiguityPicks = useCallback(
    async (picks: AmbiguityPick[]) => {
      if (!captureId) return;
      setAmbiguityBusy(true);
      try {
        const payload = picks.map((p) => ({
          fieldKey: p.fieldKey,
          label: p.label === "__keep__" ? p.original : p.label,
          id: p.id,
          original: p.original,
        }));
        const res = await fetch(`/api/document-capture/${captureId}/entity-resolution`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picks: payload }),
        });
        if (!res.ok) throw new Error("Conferma riconciliazione non riuscita");
        for (const pick of picks) {
          const ingressoKey = Object.entries(captureHints).find(
            ([, h]) => h.captureFieldKey === pick.fieldKey,
          )?.[0] as keyof SchedaIngressoFields | undefined;
          if (ingressoKey && pick.label !== "__keep__") {
            create.patch({ [ingressoKey]: pick.label } as Partial<SchedaIngressoFields>);
          }
        }
        setCaptureHints((prev) => {
          const next = { ...prev };
          for (const pick of picks) {
            const key = Object.entries(next).find(([, h]) => h.captureFieldKey === pick.fieldKey)?.[0];
            if (key) delete next[key as keyof SchedaIngressoFields];
          }
          return next;
        });
        setAmbiguityOpen(false);
        setAmbiguityItems([]);
        create.formRef.current?.requestSubmit();
      } catch (e) {
        onCompileError?.(e instanceof Error ? e.message : "Conferma non riuscita");
      } finally {
        setAmbiguityBusy(false);
      }
    },
    [captureHints, captureId, create, onCompileError],
  );

  if (loading || !sharedGlobalOpts) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <CaptureReviewPanelLoading title="Anteprima documento" message="Caricamento anteprima…" skeleton="preview" />
        <CaptureReviewPanelLoading title="Scheda ingresso" message="Preparazione campi…" skeleton="fields" />
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-[color:var(--cab-danger)]">{loadError}</p>;
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className={`lg:sticky ${CAPTURE_REVIEW_PIN_TOP_CLASS} lg:z-[1] lg:self-start`}>
          <CaptureDocumentFilePreview captureId={captureId} pinned />
        </div>
        <form
          ref={create.formRef}
          id={CAPTURE_COMPILE_FORM_ID}
          {...create.formProps}
          onSubmit={handleSubmitAttempt}
          className="min-w-0"
        >
          {create.schedaSyncError ? (
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
            onPatch={create.patch}
            pending={create.pending}
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
            onMezzoDialogAccept={create.acceptMezzoPrompt}
            onMezzoDialogDismiss={create.dismissMezzoPrompt}
            mezzoLinked={Boolean(create.mezzoId.trim())}
            mezzoId={create.mezzoId}
            sharedGlobalOpts={create.globalOpts}
            sharedMezziCatalog={create.mezziCatalog}
            captureHints={captureHints}
            onApplyCaptureHint={onApplyCaptureHint}
            captureReviewCount={reviewCount}
            embedInParentScroll
          />
        </form>
      </div>
      {create.unknownSettingsDialog}
      <CaptureEntityAmbiguityDialog
        open={ambiguityOpen}
        items={ambiguityItems}
        pending={ambiguityBusy}
        onCancel={() => {
          setAmbiguityOpen(false);
          setAmbiguityItems([]);
        }}
        onConfirm={(picks) => void confirmAmbiguityPicks(picks)}
      />
    </>
  );
}
