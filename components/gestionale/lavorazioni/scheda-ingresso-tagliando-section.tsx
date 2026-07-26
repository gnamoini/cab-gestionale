"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import type { LavorazioneInterventionType } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import {
  dsAccentSoftBanner,
  dsFocus,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";

const segmentWrap = `${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`;
const segmentOn = `${dsSegmentedBtnOn} min-w-0 flex-1 px-2 py-2 text-[11px] uppercase tracking-wide max-sm:min-h-11 sm:text-xs`;
const segmentOff = `${dsSegmentedBtnOff} min-w-0 flex-1 px-2 py-2 text-[11px] uppercase tracking-wide max-sm:min-h-11 sm:text-xs`;

const INTERVENTION_OPTIONS: { value: LavorazioneInterventionType; label: string }[] = [
  { value: "riparazione", label: "Riparazione" },
  { value: "tagliando", label: "Tagliando" },
  { value: "riparazione_tagliando", label: "Riparazione + tagliando" },
];

export function SchedaIngressoTagliandoSection({
  interventionType,
  onInterventionTypeChange,
  presetRef,
  onPresetRefChange,
  assignPresetToMezzo,
  presetPlans = [],
  mezzoLinked = false,
  mezzoHasConfig = false,
  mezzoPresetNome,
  presetLocked = false,
  disabled,
}: {
  interventionType: LavorazioneInterventionType;
  onInterventionTypeChange: (v: LavorazioneInterventionType) => void;
  presetRef?: string | null;
  onPresetRefChange?: (v: string | null) => void;
  assignPresetToMezzo?: boolean | null;
  presetPlans?: MaintenancePlanView[];
  mezzoLinked?: boolean;
  mezzoHasConfig?: boolean;
  mezzoPresetNome?: string | null;
  presetLocked?: boolean;
  disabled?: boolean;
}) {
  const isTagliando =
    interventionType === "tagliando" || interventionType === "riparazione_tagliando";

  const presetItems = useMemo(
    () => [
      { value: "", label: "— Nessun preset —" },
      ...presetPlans
        .filter((p) => isPresetAssignable(p.status))
        .map((p) => ({ value: p.id, label: p.nome })),
    ],
    [presetPlans],
  );

  return (
    <FormSection title="Intervento">
      <FormField label="Tipo intervento">
        <div className={segmentWrap} role="group" aria-label="Tipo intervento">
          {INTERVENTION_OPTIONS.map(({ value, label }) => {
            const active = interventionType === value;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onInterventionTypeChange(value)}
                className={`${active ? segmentOn : segmentOff} ${dsFocus}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </FormField>

      {isTagliando && onPresetRefChange ? (
        <FormField label="Preset manutenzione" htmlFor="tagliando-preset-ref">
          {mezzoHasConfig && mezzoPresetNome ? (
            <p className={`${dsAccentSoftBanner} mb-2 px-3 py-2 text-xs leading-snug`}>
              Preset già impostato sul mezzo: <strong>{mezzoPresetNome}</strong> — i ricambi verranno
              precompilati automaticamente.
            </p>
          ) : mezzoLinked && !mezzoHasConfig ? (
            <p className="mb-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] px-3 py-2 text-xs leading-snug text-[color:var(--cab-text-muted)]">
              Nessun preset sul mezzo. Se ne selezioni uno, potrai assegnarlo anche alla scheda tagliandi
              del mezzo.
            </p>
          ) : null}
          <GlobalSelect
            id="tagliando-preset-ref"
            value={presetRef ?? ""}
            onChange={(v) => onPresetRefChange(v || null)}
            items={presetItems}
            selectOnly
            strictFromList
            preserveItemOrder
            alphabeticalBrowse={false}
            disabled={disabled || presetLocked}
          />
          {assignPresetToMezzo && presetRef && !mezzoHasConfig ? (
            <p className="mt-2 text-xs leading-snug text-[color:var(--cab-text-muted)]">
              Al salvataggio il preset verrà assegnato anche al mezzo.
            </p>
          ) : null}
        </FormField>
      ) : null}
    </FormSection>
  );
}
