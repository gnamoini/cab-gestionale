"use client";

import { memo } from "react";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { CloseButton } from "@/components/design-system";
import { useRicambioFormOptions } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import {
  emptyFornitoreAlternativoFormRow,
  type RicambioFornitoreAlternativoFormRow,
} from "@/lib/magazzino/form";
import { applyRicambioCodiceInputChange } from "@/lib/magazzino/ricambio-codice";
import { getScontoFornitoreAlternativo } from "@/lib/magazzino/fornitore-alternativo-sconto";
import { dsBtnNeutralForm, dsInput } from "@/lib/ui/design-system";

const ricambioFormInputClass = dsInput;

type Props = {
  rows: RicambioFornitoreAlternativoFormRow[];
  onChange: (rows: RicambioFornitoreAlternativoFormRow[]) => void;
  readOnly?: boolean;
};

function patchRow(
  rows: RicambioFornitoreAlternativoFormRow[],
  id: string,
  patch: Partial<RicambioFornitoreAlternativoFormRow>,
): RicambioFornitoreAlternativoFormRow[] {
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

function RicambioFornitoriAlternativiEditorInner({ rows, onChange, readOnly = false }: Props) {
  const { magazzinoMaster } = useRicambioFormOptions();

  const addRow = () => {
    if (readOnly || rows.length >= 20) return;
    onChange([...rows, emptyFornitoreAlternativoFormRow()]);
  };

  const removeRow = (id: string) => {
    if (readOnly) return;
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className={`min-w-0 ${index > 0 ? "border-t border-[color:var(--cab-border)] pt-3" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                  Fornitore alternativo {index + 1}
                </span>
                {!readOnly ? (
                  <CloseButton
                    label={`Rimuovi fornitore alternativo ${index + 1}`}
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeRow(row.id)}
                  />
                ) : null}
              </div>
              <div className="grid gap-3">
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Fornitore</span>
                  <GlobalSettingsListSelect
                    listKey="magazzino:fornitori"
                    value={row.fornitore}
                    onChange={(fornitore) => {
                      const sconto = getScontoFornitoreAlternativo(magazzinoMaster, fornitore);
                      onChange(patchRow(rows, row.id, { fornitore, sconto: String(sconto) }));
                    }}
                    disabled={readOnly}
                    placeholder="Cerca o seleziona fornitore…"
                    inputClassName={ricambioFormInputClass}
                    aria-label={`Fornitore alternativo ${index + 1}`}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Produttore</span>
                  <GlobalSettingsListSelect
                    listKey="magazzino:produttori"
                    value={row.produttore}
                    onChange={(produttore) => onChange(patchRow(rows, row.id, { produttore }))}
                    disabled={readOnly}
                    placeholder="Cerca o seleziona produttore…"
                    inputClassName={ricambioFormInputClass}
                    aria-label={`Produttore fornitore ${index + 1}`}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Codice</span>
                  <input
                    value={row.codice}
                    onChange={(e) =>
                      applyRicambioCodiceInputChange(e, (codice) => onChange(patchRow(rows, row.id, { codice })))
                    }
                    disabled={readOnly}
                    className={`${ricambioFormInputClass} font-mono`}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Prezzo €</span>
                    <GestionaleNumberInput
                      inputMode="decimal"
                      value={row.prezzo}
                      onChange={(prezzo) => onChange(patchRow(rows, row.id, { prezzo }))}
                      disabled={readOnly}
                      className={`${ricambioFormInputClass} tabular-nums`}
                      aria-label={`Prezzo fornitore alternativo ${index + 1}`}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Sconto %</span>
                    <GestionaleNumberInput
                      inputMode="decimal"
                      value={row.sconto}
                      onChange={(sconto) => onChange(patchRow(rows, row.id, { sconto }))}
                      disabled={readOnly}
                      min={0}
                      max={100}
                      className={`${ricambioFormInputClass} tabular-nums`}
                      aria-label={`Sconto fornitore alternativo ${index + 1}`}
                    />
                  </label>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {!readOnly ? (
        <button type="button" className={dsBtnNeutralForm} onClick={addRow} disabled={rows.length >= 20}>
          + Aggiungi fornitore alternativo
        </button>
      ) : null}
    </div>
  );
}

export const RicambioFornitoriAlternativiEditor = memo(
  RicambioFornitoriAlternativiEditorInner,
  (prev, next) => prev.readOnly === next.readOnly && prev.onChange === next.onChange && prev.rows === next.rows,
);
