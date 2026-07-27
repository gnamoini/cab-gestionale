"use client";

import { IconActionButton } from "@/components/design-system";
import { HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import {
  MAINTENANCE_INTERVAL_TYPES,
  MAINTENANCE_INTERVAL_TYPE_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetTriggerView } from "@/lib/maintenance-plans/types";
import {
  dsBtnNeutral,
  dsFormLabel,
  dsInput,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";

const triggerTypeItems = MAINTENANCE_INTERVAL_TYPES.map((type) => ({
  value: type,
  label: MAINTENANCE_INTERVAL_TYPE_LABELS[type],
}));

const triggerSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

const presetFormSectionClass =
  "rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))] p-4 shadow-[var(--cab-shadow-sm)]";

const conditionRowClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 shadow-[var(--cab-shadow-sm)]";

function OrDivider() {
  return (
    <div className="flex items-center gap-3 py-0.5" aria-hidden>
      <span className="h-px min-w-0 flex-1 bg-[color:var(--cab-border)]" />
      <span className="shrink-0 rounded-full border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--cab-text-muted)]">
        Oppure
      </span>
      <span className="h-px min-w-0 flex-1 bg-[color:var(--cab-border)]" />
    </div>
  );
}

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
      <div className={compact ? "mb-1" : "mb-3"}>
        <span className={dsFormLabel}>Scadenza</span>
        <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">
          Scade al <strong className="font-semibold text-[color:var(--cab-text)]">primo</strong> intervallo
          raggiunto (es. km oppure mesi).
        </p>
      </div>

      <div className="space-y-2">
        {triggers.map((t, idx) => (
          <div key={idx} className="space-y-2">
            {idx > 0 ? <OrDivider /> : null}
            <div className={conditionRowClass}>
              <div className="grid gap-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(7rem,10rem)_auto] sm:items-end">
                <div className="min-w-0">
                  <label
                    className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]"
                    htmlFor={`mp-trigger-type-${idx}`}
                  >
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
                    aria-label={`Unità condizione ${idx + 1}`}
                  />
                </div>
                <div className="min-w-0">
                  <label
                    className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]"
                    htmlFor={`mp-trigger-value-${idx}`}
                  >
                    Soglia
                    <span className="ml-1 font-normal text-[color:var(--cab-text-muted)]">
                      ({MAINTENANCE_INTERVAL_TYPE_LABELS[t.triggerType]})
                    </span>
                  </label>
                  <GestionaleNumberInput
                    id={`mp-trigger-value-${idx}`}
                    min={1}
                    inputMode="numeric"
                    className="mt-0"
                    value={String(t.threshold)}
                    onChange={(v) =>
                      onChange(
                        triggers.map((x, i) =>
                          i === idx ? { ...x, threshold: Number(v) || 0 } : x,
                        ),
                      )
                    }
                    aria-label={`Soglia condizione ${idx + 1}`}
                  />
                </div>
                <div className="flex justify-end sm:pb-0.5">
                  <IconActionButton
                    label="Rimuovi condizione"
                    tooltipForce
                    className={dsTableActionBtnDanger}
                    disabled={triggers.length <= 1}
                    onClick={() => onChange(triggers.filter((_, i) => i !== idx))}
                  >
                    <HubIconTrash className={dsTableActionGlyph} />
                  </IconActionButton>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`${dsBtnNeutral} mt-2 w-full sm:w-auto`}
        onClick={() =>
          onChange([...triggers, { triggerType: "mesi", threshold: 12, priority: triggers.length }])
        }
      >
        + Aggiungi condizione
      </button>
    </section>
  );
}
