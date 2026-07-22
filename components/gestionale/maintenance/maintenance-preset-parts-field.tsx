"use client";

import { useState } from "react";
import {
  REPLACEMENT_CONDITIONS,
  REPLACEMENT_CONDITION_LABELS,
  type ReplacementCondition,
} from "@/lib/maintenance-plans/maintenance-enums";
import { dsBtnNeutral, dsFormField, dsFormInput, dsFormLabel } from "@/lib/ui/design-system";
import { useMaintenanceRicambiSearchQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";

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
    <div className={dsFormField}>
      <span className={dsFormLabel}>Ricambi previsti nel preset</span>
      <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">
        Cerca nel magazzino e aggiungi i componenti da sostituire a ogni tagliando.
      </p>
      <input
        className={dsFormInput}
        placeholder="Cerca ricambio (codice o nome, min. 2 caratteri)…"
        value={ricSearch}
        onChange={(e) => setRicSearch(e.target.value)}
      />
      {(ricambiQ.data ?? []).length > 0 ? (
        <ul className="mt-2 max-h-32 overflow-y-auto rounded border border-[color:var(--cab-border)] text-sm">
          {(ricambiQ.data ?? []).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left hover:bg-[var(--cab-hover)]"
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
                {r.codice} — {r.nome}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {parts.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">Nessun ricambio nel preset.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {parts.map((p) => (
            <li key={p.ricambioId} className="rounded border border-[color:var(--cab-border)] p-2 text-sm">
              <div className="mb-1 font-medium">
                {p.codice} — {p.descrizione}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-[color:var(--cab-text-muted)]">
                  Q.tà
                  <input
                    type="number"
                    min={0.001}
                    step={0.001}
                    className={`${dsFormInput} ml-1 w-24`}
                    value={p.quantita}
                    onChange={(e) =>
                      onChange(
                        parts.map((x) =>
                          x.ricambioId === p.ricambioId ? { ...x, quantita: Number(e.target.value) || 0 } : x,
                        ),
                      )
                    }
                  />
                </label>
                <select
                  className={dsFormInput}
                  value={p.replacementCondition}
                  onChange={(e) =>
                    onChange(
                      parts.map((x) =>
                        x.ricambioId === p.ricambioId
                          ? { ...x, replacementCondition: e.target.value as ReplacementCondition }
                          : x,
                      ),
                    )
                  }
                >
                  {REPLACEMENT_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {REPLACEMENT_CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
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
                  className={dsBtnNeutral}
                  onClick={() => onChange(parts.filter((x) => x.ricambioId !== p.ricambioId))}
                >
                  Rimuovi
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
