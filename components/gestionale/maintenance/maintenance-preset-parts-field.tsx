"use client";

import { useState } from "react";
import { IconActionButton } from "@/components/design-system";
import { HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GlobalSelect } from "@/components/gestionale/global-input";
import {
  REPLACEMENT_CONDITIONS,
  REPLACEMENT_CONDITION_LABELS,
  type ReplacementCondition,
} from "@/lib/maintenance-plans/maintenance-enums";
import {
  dsCheckboxInput,
  dsFormField,
  dsFormLabel,
  dsInput,
  dsScrollbar,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { useMaintenanceRicambiSearchQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";

const replacementItems = REPLACEMENT_CONDITIONS.map((c) => ({
  value: c,
  label: REPLACEMENT_CONDITION_LABELS[c],
}));

const replacementSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

const presetFormSectionClass =
  "rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))] p-4 shadow-[var(--cab-shadow-sm)]";

const partRowClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 shadow-[var(--cab-shadow-sm)]";

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
          {(ricambiQ.data ?? []).map((r) => {
            const already = parts.some((p) => p.ricambioId === r.id);
            return (
              <li key={r.id} className="border-b border-[color:var(--cab-border)] last:border-b-0">
                <button
                  type="button"
                  disabled={already}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--cab-hover)] disabled:cursor-not-allowed disabled:opacity-55"
                  onClick={() => {
                    if (already) return;
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
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs font-semibold text-[color:var(--cab-text)]">{r.codice}</span>
                    <span className="block text-[color:var(--cab-text-muted)]">{r.nome}</span>
                  </span>
                  {already ? (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                      Già aggiunto
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {parts.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--cab-text-muted)]">Nessun ricambio nel preset.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {parts.map((p) => (
            <li key={p.ricambioId} className={partRowClass}>
              <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-[color:var(--cab-text)]">{p.codice}</p>
                  <p className="mt-0.5 text-sm font-medium leading-snug text-[color:var(--cab-text)]">{p.descrizione}</p>
                </div>
                <label className="inline-flex shrink-0 items-center gap-2 pt-0.5 text-xs font-medium text-[color:var(--cab-text)]">
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
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(5rem,7rem)_minmax(8rem,1fr)_auto] sm:items-end">
                <div className="min-w-0">
                  <label
                    className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]"
                    htmlFor={`mp-part-qty-${p.ricambioId}`}
                  >
                    Quantità
                  </label>
                  <GestionaleNumberInput
                    id={`mp-part-qty-${p.ricambioId}`}
                    min={0.001}
                    inputMode="decimal"
                    className="mt-0"
                    value={String(p.quantita)}
                    onChange={(v) =>
                      onChange(
                        parts.map((x) =>
                          x.ricambioId === p.ricambioId ? { ...x, quantita: Number(v) || 0 } : x,
                        ),
                      )
                    }
                    aria-label={`Quantità ${p.codice}`}
                  />
                </div>
                <div className="min-w-0">
                  <label
                    className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]"
                    htmlFor={`mp-part-cond-${p.ricambioId}`}
                  >
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
                <div className="flex justify-end sm:pb-0.5">
                  <IconActionButton
                    label="Rimuovi ricambio"
                    tooltipForce
                    className={dsTableActionBtnDanger}
                    onClick={() => onChange(parts.filter((x) => x.ricambioId !== p.ricambioId))}
                  >
                    <HubIconTrash className={dsTableActionGlyph} />
                  </IconActionButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
