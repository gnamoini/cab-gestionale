"use client";

import { GlobalSelect, GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { CloseButton } from "@/components/design-system";
import {
  emptyFornitoreAlternativoFormRow,
  type RicambioFornitoreAlternativoFormRow,
} from "@/lib/magazzino/form";
import { produttoriForFornitore } from "@/lib/magazzino/fornitore-produttore-master";
import { applyRicambioCodiceInputChange } from "@/lib/magazzino/ricambio-codice";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { dsBtnNeutral, dsInput } from "@/lib/ui/design-system";

const ricambioFormInputClass = dsInput;
const ricambioFormSecondaryBtnClass = `${dsBtnNeutral} h-11 min-h-11 shrink-0 whitespace-nowrap px-3 text-[11px] font-semibold`;

const noSpinner =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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

export function RicambioFornitoriAlternativiEditor({ rows, onChange, readOnly = false }: Props) {
  const globalOpts = useGlobalOptions({ debugTag: "RicambioFornitoriAlternativiEditor" });
  const master = globalOpts.magazzinoMaster;

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
      {rows.length === 0 ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">Nessun fornitore alternativo. Aggiungine uno se serve.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const produttori = produttoriForFornitore(master, row.fornitore);
            const produttoreItems = [
              { value: "", label: produttori.length ? "Seleziona produttore…" : "Nessun produttore in impostazioni" },
              ...produttori.map((p) => ({ value: p, label: p })),
            ];
            return (
              <li
                key={row.id}
                className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3"
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
                        const nextProduttori = produttoriForFornitore(master, fornitore);
                        const keepProduttore = nextProduttori.includes(row.produttore) ? row.produttore : "";
                        onChange(patchRow(rows, row.id, { fornitore, produttore: keepProduttore }));
                      }}
                      disabled={readOnly}
                      placeholder="Cerca o seleziona fornitore…"
                      inputClassName={ricambioFormInputClass}
                      aria-label={`Fornitore alternativo ${index + 1}`}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Produttore</span>
                    <GlobalSelect
                      selectOnly
                      variant="default"
                      value={row.produttore}
                      onChange={(produttore) => onChange(patchRow(rows, row.id, { produttore }))}
                      disabled={readOnly || !row.fornitore.trim()}
                      items={produttoreItems}
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
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        value={row.prezzo}
                        onChange={(e) => onChange(patchRow(rows, row.id, { prezzo: e.target.value }))}
                        disabled={readOnly}
                        className={`${ricambioFormInputClass} ${noSpinner} tabular-nums`}
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Sconto %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        inputMode="decimal"
                        value={row.sconto}
                        onChange={(e) => onChange(patchRow(rows, row.id, { sconto: e.target.value }))}
                        disabled={readOnly}
                        className={`${ricambioFormInputClass} ${noSpinner} tabular-nums`}
                      />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!readOnly ? (
        <button type="button" className={ricambioFormSecondaryBtnClass} onClick={addRow} disabled={rows.length >= 20}>
          + Aggiungi fornitore alternativo
        </button>
      ) : null}
    </div>
  );
}
