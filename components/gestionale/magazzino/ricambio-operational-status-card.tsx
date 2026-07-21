"use client";

import {
  formatCoverageLabel,
  parseMagazzinoStockPolicy,
  resolveStockOperationalStatus,
  type MagazzinoStockPolicy,
} from "@/lib/magazzino/stock-policy";
import { formatAvgMonthlyMagazzinoIt } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioConsumoDaLog } from "@/lib/magazzino/ricambio-consumo-from-log";

const STATUS_LABEL: Record<ReturnType<typeof resolveStockOperationalStatus>, string> = {
  normale: "Normale",
  riordino: "Riordino necessario",
  critico: "Critico",
  sconosciuto: "—",
};

const STATUS_CLASS: Record<ReturnType<typeof resolveStockOperationalStatus>, string> = {
  normale: "text-emerald-700 dark:text-emerald-400",
  riordino: "text-amber-700 dark:text-amber-400",
  critico: "text-red-700 dark:text-red-400",
  sconosciuto: "text-[color:var(--cab-text-muted)]",
};

export function RicambioOperationalStatusCard({
  descrizione,
  scorta,
  scortaMinima,
  consumo,
  stockPolicyRaw,
  embedded = false,
}: {
  descrizione: string;
  scorta: number;
  scortaMinima: number;
  consumo: RicambioConsumoDaLog | undefined;
  stockPolicyRaw?: unknown;
  /** In sezione collapsible: senza titolo descrizione e senza doppio bordo. */
  embedded?: boolean;
}) {
  const policy: MagazzinoStockPolicy = parseMagazzinoStockPolicy(stockPolicyRaw);
  const avg = consumo?.avgMonthly ?? null;
  const status = resolveStockOperationalStatus({
    scorta,
    scortaMinima,
    avgMonthlyConsumption: avg,
    policy,
  });

  const shellClass = embedded
    ? "pb-1"
    : "rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-elevated)_92%,var(--cab-primary)_8%)] px-3 py-2.5";

  return (
    <div className={shellClass}>
      {!embedded ? (
        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{descrizione.trim() || "Ricambio"}</p>
      ) : null}
      <div className={`grid grid-cols-2 gap-x-3 gap-y-1 text-xs ${embedded ? "" : "mt-2"}`}>
        <div>
          <span className="text-[color:var(--cab-text-muted)]">Disponibilità</span>
          <p className="font-mono font-semibold tabular-nums">{scorta}</p>
        </div>
        <div>
          <span className="text-[color:var(--cab-text-muted)]">Minimo</span>
          <p className="font-mono font-semibold tabular-nums">{scortaMinima}</p>
        </div>
        <div>
          <span className="text-[color:var(--cab-text-muted)]">Consumo</span>
          <p className="font-medium">{avg != null ? formatAvgMonthlyMagazzinoIt(avg) : "—"}</p>
        </div>
        <div>
          <span className="text-[color:var(--cab-text-muted)]">Copertura</span>
          <p className="font-medium">{formatCoverageLabel(scorta, avg)}</p>
        </div>
      </div>
      <p className={`mt-2 text-xs font-semibold ${STATUS_CLASS[status]}`}>Stato: {STATUS_LABEL[status]}</p>
    </div>
  );
}
