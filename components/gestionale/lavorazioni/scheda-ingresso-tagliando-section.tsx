"use client";

import { useMemo, type ReactNode } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import {
  dsAccentSoftBanner,
  dsCheckboxInput,
  dsCheckboxOptionLabel,
} from "@/lib/ui/design-system";

const garanziaBadgeClass =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-[10px] font-bold leading-none tracking-wide text-white";

const repairBadgeClass =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-700 text-[10px] font-bold leading-none tracking-wide text-white";

const tagliandoBadgeClass =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-700 text-[10px] font-bold leading-none tracking-wide text-white";

const recidivoBadgeClass =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-700 text-[10px] font-bold leading-none tracking-wide text-white";

function InterventoCheckbox({
  id,
  label,
  checked,
  disabled,
  badge,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  hint?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={dsCheckboxOptionLabel}>
      <input
        id={id}
        type="checkbox"
        className={dsCheckboxInput}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-[color:var(--cab-text)]">
          {label}
          {checked ? badge : null}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-snug text-[color:var(--cab-text-muted)]">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

export function SchedaIngressoTagliandoSection({
  repairPresent = false,
  onRepairPresentChange,
  isTagliando = false,
  onIsTagliandoChange,
  isGaranzia = false,
  onIsGaranziaChange,
  isRecidivo = false,
  onIsRecidivoChange,
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
  repairPresent?: boolean;
  onRepairPresentChange?: (v: boolean) => void;
  isTagliando?: boolean;
  onIsTagliandoChange?: (v: boolean) => void;
  isGaranzia?: boolean;
  onIsGaranziaChange?: (v: boolean) => void;
  isRecidivo?: boolean;
  onIsRecidivoChange?: (v: boolean) => void;
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
      {onRepairPresentChange ? (
        <FormField label="Riparazione">
          <InterventoCheckbox
            id="ingresso-intervento-riparazione"
            label="Riparazione"
            checked={repairPresent}
            disabled={disabled}
            badge={
              <span className={repairBadgeClass} aria-hidden>
                R
              </span>
            }
            onChange={onRepairPresentChange}
          />
        </FormField>
      ) : null}

      {onIsTagliandoChange ? (
        <FormField label="Tagliando">
          <InterventoCheckbox
            id="ingresso-intervento-tagliando"
            label="Tagliando"
            checked={isTagliando}
            disabled={disabled}
            badge={
              <span className={tagliandoBadgeClass} aria-hidden>
                T
              </span>
            }
            onChange={onIsTagliandoChange}
          />
        </FormField>
      ) : null}

      {onIsGaranziaChange ? (
        <FormField label="Garanzia">
          <InterventoCheckbox
            id="ingresso-intervento-garanzia"
            label="In garanzia"
            checked={isGaranzia}
            disabled={disabled}
            badge={
              <span className={garanziaBadgeClass} aria-hidden>
                G
              </span>
            }
            hint="In lista compare il badge G nella colonna note"
            onChange={onIsGaranziaChange}
          />
        </FormField>
      ) : null}

      {onIsRecidivoChange ? (
        <FormField label="Recidivo">
          <InterventoCheckbox
            id="ingresso-intervento-recidivo"
            label="Recidivo"
            checked={isRecidivo}
            disabled={disabled}
            badge={
              <span className={recidivoBadgeClass} aria-hidden>
                Rc
              </span>
            }
            hint="Mezzo che rientra per lavorazioni non eseguite bene"
            onChange={onIsRecidivoChange}
          />
        </FormField>
      ) : null}

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
