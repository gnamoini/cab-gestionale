"use client";

import { prezzoNetto } from "@/lib/magazzino/calculations";
import { formatMarkupDisplay } from "@/lib/magazzino/form";

function defaultEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3 border-b border-[color:var(--cab-border)] py-2 text-sm last:border-b-0">
      <span className="font-medium text-[color:var(--cab-text-muted)]">{label}</span>
      <span className="text-right font-medium tabular-nums text-[color:var(--cab-text)]">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-card)] px-2.5 py-1 shadow-[var(--cab-shadow-sm)]">
      <h3 className="border-b border-[color:var(--cab-border)] px-1 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {title}
      </h3>
      <div className="px-1">{children}</div>
    </section>
  );
}

export function MagazzinoPrezziLineari({
  formatEur = defaultEur,
  listinoOE,
  scontoOE,
  listinoAlt,
  scontoAlt,
  markupPct,
  prezzoVendita,
  title = "Prezzi e margini",
}: {
  formatEur?: (n: number) => string;
  listinoOE: number;
  scontoOE: number;
  listinoAlt: number;
  scontoAlt: number;
  markupPct: number;
  prezzoVendita: number;
  title?: string;
}) {
  const nettoOE = prezzoNetto(listinoOE, scontoOE);
  const nettoAlt = prezzoNetto(listinoAlt, scontoAlt);
  const margine = Math.round((prezzoVendita - nettoOE) * 100) / 100;

  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-3 py-2.5 shadow-[var(--cab-shadow-sm)]">
      <p className="mb-2.5 border-b border-[color:var(--cab-border)] pb-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text)]">
        {title}
      </p>
      <div className="space-y-2.5">
        <Section title="Originale">
          <Row label="Prezzo originale" value={formatEur(listinoOE)} />
          <Row label="Sconto originale" value={`${scontoOE}%`} />
          <Row label="Netto originale" value={formatEur(nettoOE)} />
        </Section>
        <Section title="Alternativo">
          <Row label="Prezzo alternativo" value={formatEur(listinoAlt)} />
          <Row label="Sconto alternativo" value={`${scontoAlt}%`} />
          <Row label="Netto alternativo" value={formatEur(nettoAlt)} />
        </Section>
        <Section title="Vendita">
          <Row label="Prezzo vendita" value={formatEur(prezzoVendita)} />
          <Row label="Markup" value={formatMarkupDisplay(markupPct)} />
          <Row label="Margine (vs netto originale)" value={formatEur(margine)} />
        </Section>
      </div>
    </div>
  );
}
