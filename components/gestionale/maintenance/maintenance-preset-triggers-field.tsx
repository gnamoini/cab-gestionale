"use client";

import {
  MAINTENANCE_INTERVAL_TYPES,
  MAINTENANCE_INTERVAL_TYPE_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetTriggerView } from "@/lib/maintenance-plans/types";
import { defaultDualTriggers } from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import { dsBtnNeutral, dsFormInput, dsFormLabel } from "@/lib/ui/design-system";

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
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <span className={dsFormLabel}>Scadenza (primo intervallo raggiunto)</span>
        {!compact ? (
          <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">
            Es. 500 ore <strong>oppure</strong> 12 mesi — aggiungi un trigger per ogni unità.
          </p>
        ) : null}
      </div>
      {triggers.map((t, idx) => (
        <div key={idx}>
          {idx > 0 ? (
            <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
              Oppure
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={dsFormInput}
              value={t.triggerType}
              onChange={(e) =>
                onChange(
                  triggers.map((x, i) =>
                    i === idx ? { ...x, triggerType: e.target.value as MaintenanceIntervalType } : x,
                  ),
                )
              }
            >
              {MAINTENANCE_INTERVAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MAINTENANCE_INTERVAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className={`${dsFormInput} w-28`}
              value={t.threshold}
              onChange={(e) =>
                onChange(
                  triggers.map((x, i) =>
                    i === idx ? { ...x, threshold: Number(e.target.value) || 0 } : x,
                  ),
                )
              }
            />
            <button
              type="button"
              className={dsBtnNeutral}
              disabled={triggers.length <= 1}
              onClick={() => onChange(triggers.filter((_, i) => i !== idx))}
            >
              Rimuovi
            </button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() =>
            onChange([...triggers, { triggerType: "mesi", threshold: 12, priority: triggers.length }])
          }
        >
          + Aggiungi condizione
        </button>
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() => onChange(defaultDualTriggers("ore_mesi"))}
        >
          Modello ore + mesi
        </button>
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() => onChange(defaultDualTriggers("km_mesi"))}
        >
          Modello km + mesi
        </button>
      </div>
    </div>
  );
}
