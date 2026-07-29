"use client";

import { MEZZO_PERMANENT_FIELD_LABELS } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import type { CaptureConflictResolution } from "@/lib/document-capture/capture-mezzo-match-state";
import type { CaptureIngressoMergeResult } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import { dsBtnNeutral, dsBtnSoftOrange, dsFocus } from "@/lib/ui/design-system";

export function CaptureMezzoFieldConflictHints({
  mergeResult,
  conflictResolutions,
  onResolve,
}: {
  mergeResult: CaptureIngressoMergeResult;
  conflictResolutions: Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>>;
  onResolve: (field: MezzoPermanentFieldKey, resolution: CaptureConflictResolution) => void;
}) {
  const unresolved = mergeResult.conflicts.filter((c) => !conflictResolutions[c.field]);
  if (unresolved.length === 0) return null;

  return (
    <div className="space-y-2" role="region" aria-label="Conflitti scansione e registro mezzo">
      {unresolved.map((conflict) => (
        <div
          key={conflict.field}
          className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning,#d97706)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning,#d97706)_8%,var(--cab-surface))] px-3 py-2.5 text-sm"
        >
          <p className="font-medium text-[color:var(--cab-fg)]">
            ⚠ Differenza rilevata — {MEZZO_PERMANENT_FIELD_LABELS[conflict.field]}
          </p>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
            Registro: <span className="font-medium">{conflict.registryValue || "—"}</span>
          </p>
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            Scansione: <span className="font-medium">{conflict.scannedValue || "—"}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${dsBtnSoftOrange} ${dsFocus} text-xs`}
              onClick={() => onResolve(conflict.field, "registry")}
            >
              Mantieni registro
            </button>
            <button
              type="button"
              className={`${dsBtnSoftOrange} ${dsFocus} text-xs`}
              onClick={() => onResolve(conflict.field, "scan")}
            >
              Usa scansione
            </button>
            <button
              type="button"
              className={`${dsBtnNeutral} ${dsFocus} text-xs`}
              onClick={() => onResolve(conflict.field, "manual")}
            >
              Modifica manualmente
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
