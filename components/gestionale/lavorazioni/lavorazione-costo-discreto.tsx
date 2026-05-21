"use client";

import { useState } from "react";
import {
  formatLavorazioneCostoEuro,
  type LavorazioneCostoBreakdown,
} from "@/lib/lavorazioni/lavorazione-costo";
import { useRbac } from "@/src/hooks/use-rbac";

function CostoDettaglio({ costo, section }: { costo: LavorazioneCostoBreakdown; section?: boolean }) {
  const labelClass = section
    ? "text-[color:var(--cab-text-muted)]"
    : "text-zinc-500 dark:text-zinc-400";
  const valueClass = section
    ? "text-[color:var(--cab-text)]"
    : "text-zinc-700 dark:text-zinc-300";
  const totalLabelClass = section
    ? "text-sm font-semibold text-[color:var(--cab-text)]"
    : "font-medium text-zinc-600 dark:text-zinc-300";
  const totalValueClass = section ? "text-base font-semibold" : "text-sm font-semibold";
  const borderClass = section
    ? "border-[color:var(--cab-border)]"
    : "border-zinc-100 dark:border-zinc-800";

  return (
    <dl className={`grid gap-1.5 text-[11px] ${section ? "mt-1.5" : "mt-2"} ${labelClass}`}>
      <div className="flex justify-between gap-3">
        <dt>Manodopera ({costo.oreTotali} h × {formatLavorazioneCostoEuro(costo.costoOrario)}/h)</dt>
        <dd className={`tabular-nums ${valueClass}`}>{formatLavorazioneCostoEuro(costo.manodoperaTotale)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Ricambi ({costo.righeRicambi} righe, prezzo acquisto)</dt>
        <dd className={`tabular-nums ${valueClass}`}>{formatLavorazioneCostoEuro(costo.ricambiTotale)}</dd>
      </div>
      <div className={`flex justify-between gap-3 border-t pt-1.5 ${borderClass}`}>
        <dt className={totalLabelClass}>Totale</dt>
        <dd className={`tabular-nums ${totalValueClass} ${valueClass}`}>
          {formatLavorazioneCostoEuro(costo.costoTotale)}
        </dd>
      </div>
    </dl>
  );
}

export function LavorazioneCostoDiscreto({
  costo,
  className = "",
  variant = "footer",
}: {
  costo: LavorazioneCostoBreakdown | null;
  className?: string;
  /** `section`: card Panoramica; `footer`: blocco compatto sotto altri contenuti. */
  variant?: "footer" | "section";
}) {
  const rbac = useRbac();
  const canView = rbac.hasCapability("can_write_operational");
  const [open, setOpen] = useState(variant === "section");

  if (!canView || !costo) return null;

  if (variant === "section") {
    return (
      <section
        className={`rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2.5 py-2 shadow-[var(--cab-shadow-sm)] ${className}`}
        data-internal-cost
      >
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-primary)]">Costo totale</h3>
        <CostoDettaglio costo={costo} section />
      </section>
    );
  }

  return (
    <div
      className={`mt-4 border-t border-dashed border-zinc-200/80 pt-3 dark:border-zinc-800/80 ${className}`}
      data-internal-cost
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        aria-expanded={open}
        title="Costo interno lavorazione (solo staff)"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-70" aria-hidden>
            💰
          </span>
          <span className="font-medium uppercase tracking-wide">Costo totale</span>
        </span>
        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{formatLavorazioneCostoEuro(costo.costoTotale)}</span>
      </button>
      {open ? <CostoDettaglio costo={costo} /> : null}
    </div>
  );
}
