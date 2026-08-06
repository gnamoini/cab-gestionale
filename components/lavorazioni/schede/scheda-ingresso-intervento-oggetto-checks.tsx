"use client";

import {
  patchInterventoOggettoChecks,
  resolveInterventoOggettoChecks,
} from "@/lib/schede/scheda-ingresso-intervento-oggetto-checks";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";
import { dsCheckboxInput } from "@/lib/ui/design-system";
import type { SchedaIngressoFields } from "@/types/schede";

function OggettoCheckbox({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-start gap-2.5 py-0.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
      <input
        id={id}
        type="checkbox"
        className={`${dsCheckboxInput} mt-0.5`}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1 text-sm font-medium text-[color:var(--cab-text)]">{label}</span>
    </label>
  );
}

export function SchedaIngressoInterventoOggettoChecks({
  fields,
  onPatch,
  disabled = false,
}: {
  fields: SchedaIngressoFields;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  disabled?: boolean;
}) {
  const checks = resolveInterventoOggettoChecks(fields);

  const apply = (patch: Partial<{ suAttrezzatura: boolean; suTelaio: boolean }>) => {
    onPatch(patchInterventoOggettoChecks(checks, patch));
  };

  return (
    <div>
      <span className={`block ${gestionaleFieldLabelClass}`}>Oggetto intervento</span>
      <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Oggetto intervento">
        <OggettoCheckbox
          id="ingresso-intervento-su-attrezzatura"
          label="Attrezzatura"
          checked={checks.suAttrezzatura}
          disabled={disabled}
          onChange={(v) => {
            if (!v && !checks.suTelaio) return;
            apply({ suAttrezzatura: v });
          }}
        />
        <OggettoCheckbox
          id="ingresso-intervento-su-telaio"
          label="Telaio"
          checked={checks.suTelaio}
          disabled={disabled}
          onChange={(v) => {
            if (!v && !checks.suAttrezzatura) return;
            apply({ suTelaio: v });
          }}
        />
      </div>
    </div>
  );
}
