"use client";

import { useState } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GlobalSelect } from "@/components/gestionale/global-input";
import {
  REPLACEMENT_CONDITIONS,
  REPLACEMENT_CONDITION_LABELS,
  type ReplacementCondition,
} from "@/lib/maintenance-plans/maintenance-enums";
import {
  dsBtnNeutral,
  dsCheckboxInput,
  dsFormField,
  dsFormInput,
  dsFormLabel,
  dsInput,
  dsScrollbar,
} from "@/lib/ui/design-system";
import { useMaintenanceRicambiSearchQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";

const replacementItems = REPLACEMENT_CONDITIONS.map((c) => ({
  value: c,
  label: REPLACEMENT_CONDITION_LABELS[c],
}));

const replacementSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

const presetFormSectionClass =
  "rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))] p-4 shadow-[var(--cab-shadow-sm)]";

export type MaintenancePresetPartDraft = {
  ricambioId: string;
  codice: string;
  descrizione: string;
  quantita: number;
  isRequired: boolean;
  replacementCondition: ReplacementCondition;
  note: string;
};

export function planPartsToDraft(
  parts: {
    ricambioId: string;
    codice: string;
    descrizione: string;
    quantita: number;
    isRequired: boolean;
    replacementCondition: ReplacementCondition;
    note: string;
  }[],
): MaintenancePresetPartDraft[] {
  return parts.map((p) => ({ ...p }));
}

export function MaintenancePresetPartsField({
  parts,
  onChange,
  enabled = true,
}: {
  parts: MaintenancePresetPartDraft[];
  onChange: (next: MaintenancePresetPartDraft[]) => void;
  enabled?: boolean;
}) {
  const [ricSearch, setRicSearch] = useState("");
  const ricambiQ = useMaintenanceRicambiSearchQuery(ricSearch, enabled && ricSearch.trim().length >= 2);

  return (
    <section className={`${dsFormField} ${presetFormSectionClass}`}>
      <div className="mb-3">
        <span className={dsFormLabel}>Ricambi previsti</span>
        <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">
          Cerca nel magazzino e aggiungi i componenti da sostituire a ogni tagliando.
        </p>
      </div>

      <GestionaleSearchField
        value={ricSearch}
        onChange={(e) => setRicSearch(e.target.value)}
        placeholder="Cerca ricambio (codice o nome, min. 2 caratteri)…"
        aria-label="Cerca ricambio da aggiungere al preset"
      />

      {(ricambiQ.data ?? []).length > 0 ? (
        <ul
          className={`mt-2 max-h-36 overflow-y-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] ${dsScrollbar}`}
        >
          {(ricambiQ.data ?? []).map((r) => (
            <li key={r.id} className="border-b border-[color:var(--cab-border)] last:border-b-0">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--cab-hover)]"
                onClick={() => {
                  if (parts.some((p) => p.ricambioId === r.id)) return;
                  onChange([
                    ...parts,
                    {
                      ricambioId: r.id,
                      codice: r.codice,
                      descrizione: r.nome,
                      quantita: 1,
                      isRequired: true,
                      replacementCondition: "sempre",
                      note: "",
                    },
                  ]);
                  setRicSearch("");
                }}
              >
                <span className="font-medium text-[color:var(--cab-text)]">{r.codice}</span>
                <span className="text-[color:var(--cab-text-muted)]"> — {r.nome}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {parts.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--cab-text-muted)]">Nessun ricambio nel preset.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {parts.map((p) => (
            <li
              key={p.ricambioId}
              className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 text-sm"
            >
              <div className="mb-2 font-medium text-[color:var(--cab-text)]">
                {p.codice} — {p.descrizione}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(5rem,6rem)_1fr_auto] lg:items-end">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]" htmlFor={`mp-part-qty-${p.ricambioId}`}>
                    Quantità
                  </label>
                  <input
                    id={`mp-part-qty-${p.ricambioId}`}
                    type="number"
                    min={0.001}
                    step={0.001}
                    className={dsFormInput}
                    value={p.quantita}
                    onChange={(e) =>
                      onChange(
                        parts.map((x) =>
                          x.ricambioId === p.ricambioId ? { ...x, quantita: Number(e.target.value) || 0 } : x,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]" htmlFor={`mp-part-cond-${p.ricambioId}`}>
                    Condizione
                  </label>
                  <GlobalSelect
                    id={`mp-part-cond-${p.ricambioId}`}
                    variant="filter"
                    inputClassName={replacementSelectClass}
                    items={replacementItems}
                    value={p.replacementCondition}
                    onChange={(value) =>
                      onChange(
                        parts.map((x) =>
                          x.ricambioId === p.ricambioId
                            ? { ...x, replacementCondition: value as ReplacementCondition }
                            : x,
                        ),
                      )
                    }
                    strictFromList
                    selectOnly
                    aria-label={`Condizione sostituzione ${p.codice}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-stretch">
                  <label className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-[color:var(--cab-text)]">
                    <input
                      type="checkbox"
                      className={dsCheckboxInput}
                      checked={p.isRequired}
                      onChange={(e) =>
                        onChange(
                          parts.map((x) =>
                            x.ricambioId === p.ricambioId ? { ...x, isRequired: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    Obbligatorio
                  </label>
                  <button
                    type="button"
                    className={`${dsBtnNeutral} h-11 w-full`}
                    onClick={() => onChange(parts.filter((x) => x.ricambioId !== p.ricambioId))}
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
