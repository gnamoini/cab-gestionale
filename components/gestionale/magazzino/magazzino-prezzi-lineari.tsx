"use client";

import type { ReactNode } from "react";
import { ricambioModalSectionClass } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { prezzoNetto } from "@/lib/magazzino/calculations";
import { formatMarkupDisplay } from "@/lib/magazzino/form";
import type { RicambioFornitoreAlternativo } from "@/lib/magazzino/types";

function defaultEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function PrezzoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-zinc-100 py-2 text-sm last:border-b-0 dark:border-zinc-800">
      <span className="font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  );
}

function PrezzoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
      {children}
    </div>
  );
}

export function MagazzinoPrezziLineari({
  formatEur = defaultEur,
  listinoOE,
  scontoOE,
  fornitoriAlternativi = [],
  listinoAlt,
  scontoAlt,
  markupPct,
  prezzoVendita,
  title = "Prezzi e margini",
}: {
  formatEur?: (n: number) => string;
  listinoOE: number;
  scontoOE: number;
  fornitoriAlternativi?: RicambioFornitoreAlternativo[];
  /** @deprecated Usare fornitoriAlternativi; fallback primo alternativo. */
  listinoAlt?: number;
  scontoAlt?: number;
  markupPct: number;
  prezzoVendita: number;
  title?: string;
}) {
  const nettoOE = prezzoNetto(listinoOE, scontoOE);
  const margine = Math.round((prezzoVendita - nettoOE) * 100) / 100;

  const altRows =
    fornitoriAlternativi.length > 0
      ? fornitoriAlternativi
      : listinoAlt != null && scontoAlt != null
        ? [
            {
              id: "legacy",
              fornitore: "",
              produttore: "",
              codice: "",
              prezzo: listinoAlt,
              sconto: scontoAlt,
            },
          ]
        : [];

  const altWithPrice = altRows.filter((r) => r.prezzo > 0 || r.fornitore.trim() || r.codice.trim());

  return (
    <div className={ricambioModalSectionClass}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]">{title}</p>
      <div className="mt-2 space-y-3">
        <PrezzoGroup title="Originale">
          <PrezzoRow label="Prezzo originale" value={formatEur(listinoOE)} />
          <PrezzoRow label="Sconto originale" value={`${scontoOE}%`} />
          <PrezzoRow label="Netto originale" value={formatEur(nettoOE)} />
        </PrezzoGroup>
        {altWithPrice.length > 0 ? (
          <PrezzoGroup title={altWithPrice.length > 1 ? "Alternativi" : "Alternativo"}>
            {altWithPrice.map((row, i) => {
              const nettoAlt = prezzoNetto(row.prezzo, row.sconto);
              const label =
                row.fornitore.trim() ||
                row.produttore.trim() ||
                row.codice.trim() ||
                `Alternativo ${i + 1}`;
              return (
                <div key={row.id || i} className={i > 0 ? "mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800" : ""}>
                  <p className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
                  <PrezzoRow label="Prezzo" value={formatEur(row.prezzo)} />
                  <PrezzoRow label="Sconto" value={`${row.sconto}%`} />
                  <PrezzoRow label="Netto" value={formatEur(nettoAlt)} />
                </div>
              );
            })}
          </PrezzoGroup>
        ) : null}
        <PrezzoGroup title="Vendita">
          <PrezzoRow label="Prezzo vendita" value={formatEur(prezzoVendita)} />
          <PrezzoRow label="Markup" value={formatMarkupDisplay(markupPct)} />
          <PrezzoRow label="Margine (vs netto originale)" value={formatEur(margine)} />
        </PrezzoGroup>
      </div>
    </div>
  );
}
