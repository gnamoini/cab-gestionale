"use client";

import { GlobalSelect } from "@/components/gestionale/global-input";
import {
  MAINTENANCE_INTERVAL_TYPES,
  MAINTENANCE_INTERVAL_TYPE_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetTriggerView } from "@/lib/maintenance-plans/types";
import { dsBtnNeutral, dsFormInput, dsFormLabel, dsInput } from "@/lib/ui/design-system";

const triggerTypeItems = MAINTENANCE_INTERVAL_TYPES.map((type) => ({
  value: type,
  label: MAINTENANCE_INTERVAL_TYPE_LABELS[type],
}));

const triggerSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

const presetFormSectionClass =
  "rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))] p-4 shadow-[var(--cab-shadow-sm)]";

export function MaintenancePresetTriggersField({
  triggers,
  onChange,
  compact,
}: {
  triggers: MaintenancePresetTriggerView[];
  onChange: (next: MaintenancePresetTriggerView[]) => void;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "space-y-2" : presetFormSectionClass}>
      <div className="mb-3">
        <span className={dsFormLabel}>Scadenza</span>
        {!compact ? (
          <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">
            Il tagliando scade al <strong>primo</strong> intervallo raggiunto. Aggiungi una condizione per ogni unità
            (es. km e mesi).
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {triggers.map((t, idx) => (
          <div key={idx}>
            {idx > 0 ? (
              <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--cab-text-muted)]">
                Oppure
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-[minmax(8rem,1fr)_minmax(6rem,8rem)_auto] sm:items-end">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]" htmlFor={`mp-trigger-type-${idx}`}>
                  Unità
                </label>
                <GlobalSelect
                  id={`mp-trigger-type-${idx}`}
                  variant="filter"
                  inputClassName={triggerSelectClass}
                  items={triggerTypeItems}
                  value={t.triggerType}
                  onChange={(value) =>
                    onChange(
                      triggers.map((x, i) =>
                        i === idx ? { ...x, triggerType: value as MaintenanceIntervalType } : x,
                      ),
                    )
                  }
                  strictFromList
                  selectOnly
                  aria-label={`Unità trigger ${idx + 1}`}
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]" htmlFor={`mp-trigger-value-${idx}`}>
                  Soglia
                </label>
                <input
                  id={`mp-trigger-value-${idx}`}
                  type="number"
                  min={1}
                  className={dsFormInput}
                  value={t.threshold}
                  onChange={(e) =>
                    onChange(
                      triggers.map((x, i) =>
                        i === idx ? { ...x, threshold: Number(e.target.value) || 0 } : x,
                      ),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className={`${dsBtnNeutral} h-11 w-full sm:w-auto`}
                disabled={triggers.length <= 1}
                onClick={() => onChange(triggers.filter((_, i) => i !== idx))}
              >
                Rimuovi
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`${dsBtnNeutral} mt-3`}
        onClick={() =>
          onChange([...triggers, { triggerType: "mesi", threshold: 12, priority: triggers.length }])
        }
      >
        + Aggiungi condizione
      </button>
    </section>
  );
}
