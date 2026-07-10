"use client";

import { Tooltip } from "@/components/ui";
import { useState } from "react";
import {
  GestionaleInfoCard,
  GestionaleInfoMetricRow,
} from "@/components/design-system/gestionale-info-card";
import {
  formatLavorazioneCostoEuro,
  type LavorazioneCostoBreakdown,
} from "@/lib/lavorazioni/lavorazione-costo";
import { useRbac } from "@/src/hooks/use-rbac";

function CostoDettaglioSection({ costo }: { costo: LavorazioneCostoBreakdown }) {
  return (
    <>
      <GestionaleInfoMetricRow
        label="Manodopera"
        detail={`${costo.oreTotali} h × ${formatLavorazioneCostoEuro(costo.costoOrario)}/h`}
        value={formatLavorazioneCostoEuro(costo.manodoperaTotale)}
      />
      <GestionaleInfoMetricRow
        label="Ricambi"
        detail={`${costo.righeRicambi} righe, prezzo acquisto`}
        value={formatLavorazioneCostoEuro(costo.ricambiTotale)}
      />
      <GestionaleInfoMetricRow
        label="Totale"
        value={formatLavorazioneCostoEuro(costo.costoTotale)}
        total
      />
    </>
  );
}

function CostoDettaglioFooter({ costo }: { costo: LavorazioneCostoBreakdown }) {
  const labelClass = "text-zinc-500 dark:text-zinc-400";
  const valueClass = "text-zinc-700 dark:text-zinc-300";

  return (
    <dl className={`mt-2 grid gap-1.5 text-[11px] ${labelClass}`}>
      <div className="flex min-w-0 justify-between gap-3">
        <dt>Manodopera ({costo.oreTotali} h × {formatLavorazioneCostoEuro(costo.costoOrario)}/h)</dt>
        <dd className={`tabular-nums ${valueClass}`}>{formatLavorazioneCostoEuro(costo.manodoperaTotale)}</dd>
      </div>
      <div className="flex min-w-0 justify-between gap-3">
        <dt>Ricambi ({costo.righeRicambi} righe, prezzo acquisto)</dt>
        <dd className={`tabular-nums ${valueClass}`}>{formatLavorazioneCostoEuro(costo.ricambiTotale)}</dd>
      </div>
      <div className="flex min-w-0 justify-between gap-3 border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
        <dt className="font-medium text-zinc-600 dark:text-zinc-300">Totale</dt>
        <dd className={`tabular-nums text-sm font-semibold ${valueClass}`}>
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
  const canView = rbac.canWritePage("lavorazioni");
  const [open, setOpen] = useState(variant === "section");

  if (!canView || !costo) return null;

  if (variant === "section") {
    return (
      <GestionaleInfoCard title="Costo totale" className={className}>
        <div data-internal-cost>
          <CostoDettaglioSection costo={costo} />
        </div>
      </GestionaleInfoCard>
    );
  }

  return (
    <div
      className={`mt-4 border-t border-dashed border-zinc-200/80 pt-3 dark:border-zinc-800/80 ${className}`}
      data-internal-cost
    >
      <Tooltip content={"Costo interno lavorazione (solo staff)"}><button type="button" className="flex min-w-0 w-full items-center justify-between gap-2 text-left text-[11px] text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-70" aria-hidden>
            💰
          </span>
          <span className="font-medium uppercase tracking-wide">Costo totale</span>
        </span>
        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{formatLavorazioneCostoEuro(costo.costoTotale)}</span>
      </button></Tooltip>
      {open ? <CostoDettaglioFooter costo={costo} /> : null}
    </div>
  );
}
