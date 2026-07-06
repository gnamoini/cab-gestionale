"use client";

import { useEffect, useState } from "react";
import {
  OFFICINA_PROFILO_KEY,
  OFFICINA_PROFILO_MODULE,
  parseOfficinaProfiloOperativo,
  type OfficinaProfiloOperativo,
} from "@/lib/officina/officina-profilo-operativo";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { settingsEntry } from "@/lib/domain/settings-entry";
import { dsFocus } from "@/lib/ui/design-system";

const OPTIONS: {
  value: OfficinaProfiloOperativo;
  label: string;
  description: string;
}[] = [
  {
    value: "attrezzature",
    label: "Solo attrezzature",
    description: "Ingresso con attrezzatura e telaio collegato (campi telaio opzionali).",
  },
  {
    value: "telai",
    label: "Solo telai",
    description: "Solo anagrafica telaio; nessuna sezione attrezzatura.",
  },
  {
    value: "misto",
    label: "Misto",
    description: "Scelta oggetto intervento (telaio o attrezzatura) su ogni ingresso.",
  },
];

const profiloCardBase =
  "flex w-full min-w-0 flex-col gap-0.5 rounded-[var(--ds-radius-lg)] border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-60";
const profiloCardOn = `${profiloCardBase} border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] shadow-[var(--cab-shadow-sm)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)]`;
const profiloCardOff = `${profiloCardBase} border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] hover:border-[color:var(--cab-border-strong)] hover:bg-[var(--cab-hover)]`;

export function SettingsOfficinaProfiloSection() {
  const toast = useGestionaleToast();
  const settingsQ = useSharedAppSettingsQuery();
  const row = settingsQ?.data?.rows?.find(
    (r) => r.module === OFFICINA_PROFILO_MODULE && r.key === OFFICINA_PROFILO_KEY,
  );
  const [value, setValue] = useState<OfficinaProfiloOperativo>("attrezzature");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setValue(parseOfficinaProfiloOperativo(row?.value));
  }, [row?.value]);

  if (!settingsQ) return null;

  const disabled = pending || settingsQ.isPending;

  async function save(next: OfficinaProfiloOperativo) {
    if (next === value || disabled) return;
    setValue(next);
    setPending(true);
    const res = await settingsEntry.upsertSetting({
      module: OFFICINA_PROFILO_MODULE,
      key: OFFICINA_PROFILO_KEY,
      value: next as unknown as Record<string, unknown>,
      expectedUpdatedAt: row?.updated_at,
    });
    setPending(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio profilo officina.");
      setValue(parseOfficinaProfiloOperativo(row?.value));
      return;
    }
    toast.success("Profilo officina aggiornato.");
    await settingsQ?.refetch();
  }

  return (
    <div className="max-w-lg space-y-3">
      <p className="text-sm text-[var(--cab-text-muted)]">
        Definisce sezione telaio/attrezzatura nei form ingresso e target predefinito per nuove lavorazioni.
      </p>
      <fieldset className="min-w-0 space-y-2 border-0 p-0" disabled={disabled}>
        <legend className="mb-1 text-sm font-medium text-[var(--cab-text)]">Profilo operativo</legend>
        <div role="radiogroup" aria-label="Profilo operativo" className="space-y-2">
          {OPTIONS.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => void save(opt.value)}
                className={`${active ? profiloCardOn : profiloCardOff} ${dsFocus}`}
              >
                <span className="text-sm font-semibold text-[color:var(--cab-text)]">{opt.label}</span>
                <span className="text-xs leading-snug text-[color:var(--cab-text-muted)]">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
