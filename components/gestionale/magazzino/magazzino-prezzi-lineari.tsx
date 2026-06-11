"use client";

import type { ReactNode } from "react";
import {
  GestionaleInfoCard,
  GestionaleInfoMetricRow,
  GestionaleInfoSubgroup,
} from "@/components/design-system/gestionale-info-card";
import { RicambioCollapsibleSection } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { prezzoNetto } from "@/lib/magazzino/calculations";
import { formatMarkupDisplay } from "@/lib/magazzino/form";
import type { RicambioFornitoreAlternativo } from "@/lib/magazzino/types";

function defaultEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function PrezzoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[color:var(--cab-border)] py-2 text-sm last:border-b-0">
      <span className="font-medium text-[color:var(--cab-text-muted)]">{label}</span>
      <span className="text-right font-medium tabular-nums text-[color:var(--cab-text)]">{value}</span>
    </div>
  );
}

function PrezzoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function resolveAltWithPrice(
  fornitoriAlternativi: RicambioFornitoreAlternativo[],
  listinoAlt?: number,
  scontoAlt?: number,
) {
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

  return altRows.filter((r) => r.prezzo > 0 || r.fornitore.trim() || r.codice.trim());
}

function PrezziLineariInfoBody({
  formatEur,
  listinoOE,
  scontoOE,
  fornitoriAlternativi,
  listinoAlt,
  scontoAlt,
  markupPct,
  prezzoVendita,
}: {
  formatEur: (n: number) => string;
  listinoOE: number;
  scontoOE: number;
  fornitoriAlternativi: RicambioFornitoreAlternativo[];
  listinoAlt?: number;
  scontoAlt?: number;
  markupPct: number;
  prezzoVendita: number;
}) {
  const nettoOE = prezzoNetto(listinoOE, scontoOE);
  const margine = Math.round((prezzoVendita - nettoOE) * 100) / 100;
  const altWithPrice = resolveAltWithPrice(fornitoriAlternativi, listinoAlt, scontoAlt);

  return (
    <>
      <GestionaleInfoSubgroup title="Originale">
        <GestionaleInfoMetricRow label="Prezzo originale" value={formatEur(listinoOE)} />
        <GestionaleInfoMetricRow label="Sconto originale" value={`${scontoOE}%`} />
        <GestionaleInfoMetricRow label="Netto originale" value={formatEur(nettoOE)} />
      </GestionaleInfoSubgroup>
      {altWithPrice.map((row, i) => {
        const nettoAlt = prezzoNetto(row.prezzo, row.sconto);
        const label =
          row.fornitore.trim() ||
          row.produttore.trim() ||
          row.codice.trim() ||
          `Alternativo ${i + 1}`;
        return (
          <GestionaleInfoSubgroup key={row.id || i} title={label}>
            <GestionaleInfoMetricRow label="Prezzo" value={formatEur(row.prezzo)} />
            <GestionaleInfoMetricRow label="Sconto" value={`${row.sconto}%`} />
            <GestionaleInfoMetricRow label="Netto" value={formatEur(nettoAlt)} />
          </GestionaleInfoSubgroup>
        );
      })}
      <GestionaleInfoSubgroup title="Vendita">
        <GestionaleInfoMetricRow label="Prezzo vendita" value={formatEur(prezzoVendita)} />
        <GestionaleInfoMetricRow label="Markup" value={formatMarkupDisplay(markupPct)} />
        <GestionaleInfoMetricRow label="Margine (vs netto originale)" value={formatEur(margine)} />
      </GestionaleInfoSubgroup>
    </>
  );
}

function PrezziLineariFormBody({
  formatEur,
  listinoOE,
  scontoOE,
  fornitoriAlternativi,
  listinoAlt,
  scontoAlt,
  markupPct,
  prezzoVendita,
}: {
  formatEur: (n: number) => string;
  listinoOE: number;
  scontoOE: number;
  fornitoriAlternativi: RicambioFornitoreAlternativo[];
  listinoAlt?: number;
  scontoAlt?: number;
  markupPct: number;
  prezzoVendita: number;
}) {
  const nettoOE = prezzoNetto(listinoOE, scontoOE);
  const margine = Math.round((prezzoVendita - nettoOE) * 100) / 100;
  const altWithPrice = resolveAltWithPrice(fornitoriAlternativi, listinoAlt, scontoAlt);

  return (
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
              <div
                key={row.id || i}
                className={i > 0 ? "mt-2 border-t border-[color:var(--cab-border)] pt-2" : ""}
              >
                <p className="mb-1 text-xs font-semibold text-[color:var(--cab-text)]">{label}</p>
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
  variant = "info",
  defaultCollapsed = true,
  forceExpanded = false,
}: {
  formatEur?: (n: number) => string;
  listinoOE: number;
  scontoOE: number;
  fornitoriAlternativi?: RicambioFornitoreAlternativo[];
  listinoAlt?: number;
  scontoAlt?: number;
  markupPct: number;
  prezzoVendita: number;
  title?: string;
  variant?: "info" | "form";
  defaultCollapsed?: boolean;
  forceExpanded?: boolean;
}) {
  const bodyProps = {
    formatEur,
    listinoOE,
    scontoOE,
    fornitoriAlternativi,
    listinoAlt,
    scontoAlt,
    markupPct,
    prezzoVendita,
  };

  if (variant === "form") {
    return (
      <RicambioCollapsibleSection
        title={title}
        defaultCollapsed={defaultCollapsed}
        forceExpanded={forceExpanded}
      >
        <PrezziLineariFormBody {...bodyProps} />
      </RicambioCollapsibleSection>
    );
  }

  return (
    <GestionaleInfoCard title={title}>
      <PrezziLineariInfoBody {...bodyProps} />
    </GestionaleInfoCard>
  );
}
