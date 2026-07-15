"use client";

import { Badge } from "@/components/design-system/badge";
import {
  captureCatalogWarningsByFieldKey,
  validateCaptureFieldsAgainstCatalogs,
  type CaptureCatalogValidationInput,
  type CaptureCatalogWarning,
} from "@/lib/document-capture/capture-catalog-validation";
import {
  applyCaptureResolutionToDraft,
  formatCaptureReviewDisplayValue,
  formatCaptureReviewDraftValue,
  isCaptureMultilineFieldKey,
} from "@/lib/document-capture/capture-field-display-value";
import { sortCaptureReviewFields } from "@/lib/document-capture/capture-field-review-order";
import { captureSignatureFieldLabel, isCaptureSignatureFieldKey } from "@/lib/document-capture/capture-signature-field-keys";
import {
  CaptureReviewPanelError,
  CaptureReviewPanelFrame,
  CaptureReviewPanelLoading,
} from "@/components/document-capture/capture-review-panel";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { RichiedenteFirmaDisplay } from "@/components/gestionale/schede/richiedente-firma-display";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";
import { buildClientResolutionContext } from "@/lib/entity-resolution/build-client-resolution-context";
import type { EntityResolutionResult } from "@/lib/entity-resolution/entity-resolution-types";
import { resolveCaptureGraph } from "@/lib/entity-resolution/resolve-capture-graph";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnPrimary, dsHubModalSection, dsInput, dsLabel } from "@/lib/ui/design-system";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";

type FieldRow = {
  field_key: string;
  raw_value?: string | null;
  normalized_value: string | null;
  confirmed_value: string | null;
  confidence: number | null;
  value_source: string;
};

function fieldLabel(key: string): string {
  return captureSignatureFieldLabel(key) ?? (() => {
    const spaced = key.replace(/_/g, " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  })();
}

function safeTrim(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function draftValuesEqual(
  a: Record<string, string>,
  b: Record<string, string>,
  addettiRecords: readonly import("@/lib/lavorazioni/addetto-model").AddettoRecord[],
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = formatCaptureReviewDraftValue(key, a[key] ?? "", { addettiRecords });
    const right = formatCaptureReviewDraftValue(key, b[key] ?? "", { addettiRecords });
    if (left !== right) return false;
  }
  return true;
}

function reasonShortLabel(reason: string): string {
  const map: Record<string, string> = {
    exact_match: "Corrispondenza esatta",
    canonical_legal_suffix: "Suffisso legale rimosso",
    alias_settings: "Alias impostazioni",
    known_ocr_correction: "Correzione OCR",
    fuzzy_typo: "Correzione typo",
    hierarchy_constraint: "Vincolo gerarchia",
    graph_constraint: "Vincolo contesto",
  };
  return map[reason] ?? "Riconciliato";
}

type FieldReviewStatus = {
  tone: "ok" | "warn" | "info" | "neutral";
  label: string;
} | null;

function shouldShowAmbiguityHint(
  resolution: EntityResolutionResult | undefined,
  fieldWarnings: readonly CaptureCatalogWarning[],
): boolean {
  return resolution?.status === "ambiguous" && fieldWarnings.length === 0;
}

function fieldReviewStatus(
  resolution: EntityResolutionResult | undefined,
  fieldWarnings: readonly CaptureCatalogWarning[],
  baselineValue: string,
  draft: string,
  raw: string,
): NonNullable<FieldReviewStatus>[] {
  const badges: NonNullable<FieldReviewStatus>[] = [];

  if (shouldShowAmbiguityHint(resolution, fieldWarnings)) {
    badges.push({ tone: "warn", label: "Da confermare" });
  } else if (
    resolution?.status === "resolved" &&
    resolution.resolvedLabel &&
    safeTrim(draft).toLowerCase() === safeTrim(resolution.resolvedLabel).toLowerCase() &&
    raw &&
    safeTrim(raw).toLowerCase() !== safeTrim(resolution.resolvedLabel).toLowerCase()
  ) {
    badges.push({ tone: "ok", label: reasonShortLabel(resolution.reason) });
  } else if (baselineValue && safeTrim(baselineValue) !== safeTrim(draft)) {
    badges.push({ tone: "info", label: "Modificato" });
  }

  if (fieldWarnings.length > 0) {
    badges.push({ tone: "warn", label: "Non in anagrafica" });
  }

  return badges;
}

function CaptureReviewSummary({
  catalogWarnings,
  ambiguousCount,
}: {
  catalogWarnings: readonly CaptureCatalogWarning[];
  ambiguousCount: number;
}) {
  if (catalogWarnings.length === 0 && ambiguousCount === 0) return null;

  return (
    <div
      className="space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_38%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))] px-3 py-2.5"
      role="status"
    >
      <p className="text-sm font-medium text-[color:var(--cab-fg)]">Controlli consigliati prima di proseguire</p>
      <ul className="space-y-1 text-xs text-[color:var(--cab-text-muted)]">
        {catalogWarnings.length > 0 ? (
          <li>
            {catalogWarnings.length === 1
              ? "1 valore non corrisponde alle impostazioni del gestionale"
              : `${catalogWarnings.length} valori non corrispondono alle impostazioni del gestionale`}
          </li>
        ) : null}
        {ambiguousCount > 0 ? (
          <li>
            {ambiguousCount === 1
              ? "1 campo richiede conferma per ambiguità"
              : `${ambiguousCount} campi richiedono conferma per ambiguità`}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export type CaptureFieldReviewGridHandle = {
  saveConfirmed: () => Promise<boolean>;
  hasUnsavedChanges: () => boolean;
  getAmbiguousItems: () => Array<{ fieldKey: string; original: string; resolution: EntityResolutionResult }>;
  getResolutionResults: () => EntityResolutionResult[];
};

export function CaptureFieldReviewGrid({
  captureId,
  saveRef,
  catalogValidation,
  sharedGlobalOpts,
  magazzino = [],
  mezzi = [],
}: {
  captureId: string;
  saveRef?: Ref<CaptureFieldReviewGridHandle | null>;
  catalogValidation?: CaptureCatalogValidationInput | null;
  sharedGlobalOpts?: GlobalOptionsSlice;
  magazzino?: readonly RicambioMagazzino[];
  mezzi?: readonly MezzoGestito[];
}) {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [rawByKey, setRawByKey] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [resolutionByKey, setResolutionByKey] = useState<Record<string, EntityResolutionResult>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolutionCtx = useMemo(
    () => (sharedGlobalOpts ? buildClientResolutionContext({ sharedGlobalOpts, magazzino, mezzi }) : null),
    [magazzino, mezzi, sharedGlobalOpts],
  );

  const addettiRecords = useMemo(
    () => catalogValidation?.addettiRecords ?? sharedGlobalOpts?.lavorazioni.addettiRecords ?? [],
    [catalogValidation?.addettiRecords, sharedGlobalOpts?.lavorazioni.addettiRecords],
  );

  const runResolution = useCallback(
    async (
      draftValues: Record<string, string>,
      rawValues: Record<string, string>,
      baselineValues: Record<string, string>,
      onlyUnedited: boolean,
    ) => {
      if (!resolutionCtx) return;
      const inputs = Object.entries(draftValues)
        .filter(([, v]) => v.trim())
        .map(([field_key, value]) => ({
          field_key,
          raw_value: rawValues[field_key] ?? value,
          normalized_value: value,
        }));
      const { fields: resolved } = await resolveCaptureGraph(inputs, resolutionCtx, { captureId });
      const next: Record<string, EntityResolutionResult> = {};
      for (const row of resolved) {
        if (row.resolution.entityType !== "GENERIC") {
          next[row.field_key] = row.resolution;
        }
      }
      setResolutionByKey(next);
      const merged = applyCaptureResolutionToDraft(draftValues, baselineValues, next, {
        onlyUnedited,
        addettiRecords,
      });
      if (merged.changed) {
        setDraft(merged.draft);
        setBaseline(merged.baseline);
      }
    },
    [addettiRecords, captureId, resolutionCtx],
  );

  const catalogWarnings = useMemo(() => {
    if (!catalogValidation) return [];
    return validateCaptureFieldsAgainstCatalogs({
      ...catalogValidation,
      fields: Object.entries(draft).map(([field_key, value]) => ({ field_key, value })),
    });
  }, [catalogValidation, draft]);

  const warningsByField = useMemo(
    () => captureCatalogWarningsByFieldKey(catalogWarnings),
    [catalogWarnings],
  );

  const ambiguousCount = useMemo(
    () =>
      Object.entries(resolutionByKey).filter(
        ([fieldKey, r]) => shouldShowAmbiguityHint(r, warningsByField.get(fieldKey) ?? []),
      ).length,
    [resolutionByKey, warningsByField],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/fields`);
      if (!res.ok) {
        setLoadError("Impossibile caricare i dati letti");
        return;
      }
      const body = (await res.json()) as { fields?: FieldRow[] };
      const rows = sortCaptureReviewFields(body.fields ?? []);
      setFields(rows);
      const next: Record<string, string> = {};
      const raw: Record<string, string> = {};
      for (const f of rows) {
        const rawValue = f.raw_value ?? f.confirmed_value ?? f.normalized_value ?? "";
        raw[f.field_key] = rawValue;
        next[f.field_key] = formatCaptureReviewDisplayValue(
          f.field_key,
          {
            raw: f.raw_value,
            normalized: f.normalized_value,
            confirmed: f.confirmed_value,
          },
          { addettiRecords },
        );
      }
      setDraft(next);
      setBaseline(next);
      setRawByKey(raw);
      await runResolution(next, raw, next, false);
    } finally {
      setLoading(false);
    }
  }, [addettiRecords, captureId, runResolution]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!resolutionCtx) return;
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    resolveTimer.current = setTimeout(() => {
      void runResolution(draft, rawByKey, baselineRef.current, true);
    }, 300);
    return () => {
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
    };
  }, [draft, rawByKey, resolutionCtx, runResolution]);

  const saveConfirmed = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: Object.entries(draft).map(([fieldKey, confirmedValue]) => ({
            fieldKey,
            confirmedValue: isCaptureSignatureFieldKey(fieldKey)
              ? hasSignatureDataUrl(confirmedValue)
                ? confirmedValue.trim()
                : null
              : formatCaptureReviewDraftValue(fieldKey, confirmedValue, { addettiRecords }) || null,
            valueSource: "manual" as const,
          })),
        }),
      });
      if (!res.ok) throw new Error("Salvataggio non riuscito");
      const savedDraft = Object.fromEntries(
        Object.entries(draft).map(([fieldKey, value]) => [
          fieldKey,
          formatCaptureReviewDraftValue(fieldKey, value, { addettiRecords }),
        ]),
      );
      setBaseline(savedDraft);
      setSaved(true);
      await load();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [addettiRecords, captureId, draft, load]);

  const hasUnsavedChanges = useCallback(
    () => !draftValuesEqual(draft, baseline, addettiRecords),
    [addettiRecords, baseline, draft],
  );

  const getAmbiguousItems = useCallback(
    () =>
      Object.entries(resolutionByKey)
        .filter(([fieldKey, r]) => shouldShowAmbiguityHint(r, warningsByField.get(fieldKey) ?? []))
        .map(([fieldKey, resolution]) => ({
          fieldKey,
          original: resolution.originalValue,
          resolution,
        })),
    [resolutionByKey, warningsByField],
  );

  const getResolutionResults = useCallback(() => Object.values(resolutionByKey), [resolutionByKey]);

  useImperativeHandle(
    saveRef,
    () => ({ saveConfirmed, hasUnsavedChanges, getAmbiguousItems, getResolutionResults }),
    [getAmbiguousItems, getResolutionResults, hasUnsavedChanges, saveConfirmed],
  );

  if (loading) {
    return (
      <CaptureReviewPanelLoading title="Dati letti" message="Caricamento dati letti…" skeleton="fields" />
    );
  }

  if (loadError) {
    return (
      <CaptureReviewPanelError
        title="Dati letti"
        message={loadError}
        onRetry={() => void load()}
      />
    );
  }

  if (fields.length === 0) {
    return (
      <CaptureReviewPanelFrame title="Dati letti">
        <p className="py-6 text-sm text-[color:var(--cab-muted-fg)]">
          Nessun dato letto dalla scheda. Torna indietro, carica un file più nitido e ripeti la lettura.
        </p>
      </CaptureReviewPanelFrame>
    );
  }

  return (
    <CaptureReviewPanelFrame title="Dati letti">
      <div className="space-y-3">
      <CaptureReviewSummary catalogWarnings={catalogWarnings} ambiguousCount={ambiguousCount} />
      <div className="grid gap-2.5">
        {fields.map((f) => {
          const fieldWarnings = warningsByField.get(f.field_key) ?? [];
          const resolution = resolutionByKey[f.field_key];
          const raw = rawByKey[f.field_key] ?? "";
          const value = draft[f.field_key] ?? "";
          const baselineValue = baseline[f.field_key] ?? "";
          const badges = fieldReviewStatus(resolution, fieldWarnings, baselineValue, value, raw);
          const showOcrLine =
            !isCaptureSignatureFieldKey(f.field_key) &&
            raw &&
            (safeTrim(raw).toLowerCase() !== safeTrim(value).toLowerCase() ||
              (resolution?.resolvedLabel && safeTrim(raw) !== safeTrim(resolution.resolvedLabel)));
          const hasIssue = badges.some((b) => b.tone === "warn") || fieldWarnings.length > 0;

          return (
            <div
              key={f.field_key}
              className={`${dsHubModalSection} space-y-2 p-3 ${
                hasIssue
                  ? "border-[color:color-mix(in_srgb,var(--cab-warning)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_4%,var(--cab-card))]"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={dsLabel}>{fieldLabel(f.field_key)}</span>
                {badges.length > 0 ? (
                  <div className="flex max-w-[55%] flex-wrap justify-end gap-1">
                    {badges.map((badge) => (
                      <Badge key={badge.label} tone={badge.tone}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              {showOcrLine ? (
                <p
                  className={`text-xs leading-snug text-[color:var(--cab-text-muted)]${
                    isCaptureMultilineFieldKey(f.field_key) ? " whitespace-pre-wrap" : ""
                  }`}
                >
                  <span className="font-medium text-[color:var(--cab-text)]">Letto dal documento:</span> {raw}
                  {resolution?.resolvedLabel && safeTrim(resolution.resolvedLabel) !== safeTrim(raw) ? (
                    <>
                      <span className="mx-1.5 text-[color:var(--cab-border-strong)]" aria-hidden>
                        →
                      </span>
                      <span className="font-medium text-[color:var(--cab-fg)]">{resolution.resolvedLabel}</span>
                    </>
                  ) : null}
                </p>
              ) : null}

              {isCaptureSignatureFieldKey(f.field_key) ? (
                hasSignatureDataUrl(value) ? (
                  <RichiedenteFirmaDisplay
                    dataUrl={value}
                    consultable
                    label={captureSignatureFieldLabel(f.field_key) ?? "Firma"}
                  />
                ) : (
                  <p className="text-xs text-[color:var(--cab-text-muted)]">Firma non rilevata sul documento.</p>
                )
              ) : isCaptureMultilineFieldKey(f.field_key) ? (
                <GestionaleTextarea
                  value={value}
                  size="md"
                  onChange={(nextValue) =>
                    setDraft((cur) => ({
                      ...cur,
                      [f.field_key]: formatCaptureReviewDraftValue(f.field_key, nextValue, { addettiRecords }),
                    }))
                  }
                />
              ) : (
                <input
                  className={dsInput}
                  value={value}
                  onChange={(e) =>
                    setDraft((cur) => ({
                      ...cur,
                      [f.field_key]: formatCaptureReviewDraftValue(f.field_key, e.target.value, { addettiRecords }),
                    }))
                  }
                />
              )}

              {fieldWarnings.length > 0 ? (
                <p className="text-xs text-[color:color-mix(in_srgb,var(--cab-warning)_88%,var(--cab-text))]">
                  {fieldWarnings[0]?.message}
                </p>
              ) : null}

              {shouldShowAmbiguityHint(resolution, fieldWarnings) ? (
                <p className="text-xs text-[color:color-mix(in_srgb,var(--cab-warning)_88%,var(--cab-text))]">
                  Più corrispondenze possibili nelle impostazioni. Conferma il valore corretto prima di proseguire.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2">
        {hasUnsavedChanges() ? (
          <span className="text-xs text-[color:var(--cab-warning)]">Modifiche non salvate</span>
        ) : saved ? (
          <span className="text-xs text-[color:var(--cab-success-fg)]">Modifiche salvate</span>
        ) : null}
        <button type="button" className={dsBtnPrimary} disabled={saving} onClick={() => void saveConfirmed()}>
          {saving ? "Salvataggio…" : "Salva modifiche"}
        </button>
      </div>
      </div>
    </CaptureReviewPanelFrame>
  );
}
