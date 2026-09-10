"use client";

import { useCallback } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { formatInvoiceDate, formatInvoiceMoney } from "@/components/fatturazione/fattura-status-badge";
import { dsTableActionBtnPrimary, dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";
import type { FatturazioneOrigine } from "@/lib/fatturazione/types";

export type CicloAttivoDaFatturareRow = {
  source_type: "preventivo" | "consuntivo" | "lavorazione" | "ddt";
  source_id: string;
  source_label: string;
  cliente_label: string;
  source_date: string | null;
  totale: number;
  gia_fatturato: number;
  residuo: number;
  deadline_fiscale: string | null;
};

const SOURCE_LABEL: Record<CicloAttivoDaFatturareRow["source_type"], string> = {
  preventivo: "Preventivo",
  consuntivo: "Consuntivo",
  lavorazione: "Lavorazione",
  ddt: "DDT",
};

export function FatturazioneDaFatturareSection({
  rows,
  isLoading,
  canWrite,
  onGenerate,
}: {
  rows: CicloAttivoDaFatturareRow[];
  isLoading: boolean;
  canWrite: boolean;
  onGenerate: (origine: FatturazioneOrigine, sourceId: string) => void;
}) {
  const origineOf = useCallback((t: CicloAttivoDaFatturareRow["source_type"]): FatturazioneOrigine => {
    if (t === "ddt") return "ddt";
    if (t === "consuntivo") return "consuntivo";
    if (t === "lavorazione") return "lavorazione";
    return "preventivo";
  }, []);

  return (
    <ShellCard>
      <h2 className={dsTypoSectionTitle}>Da fatturare</h2>
      <p className={`${dsTypoSmall} mt-1`}>
        Coda operativa da allocation: preventivi accettati, consuntivi, DDT confermati con residuo.
      </p>
      {isLoading ? (
        <p className={`${dsTypoSmall} mt-4`}>Caricamento…</p>
      ) : rows.length === 0 ? (
        <p className={`${dsTypoSmall} mt-4`}>Nessun documento da fatturare.</p>
      ) : (
        <ul className={`mt-4 ${LIST_DIVIDER_UL}`}>
          {rows.map((row) => (
            <li key={`${row.source_type}:${row.source_id}`} className="flex items-center justify-between gap-2 py-3 min-w-0 flex-nowrap sm:flex-wrap">
              <div className="min-w-0">
                <p className="font-medium">
                  {SOURCE_LABEL[row.source_type]} {row.source_label} · {row.cliente_label}
                </p>
                <p className={dsTypoSmall}>
                  {formatInvoiceDate(row.source_date)} · residuo {formatInvoiceMoney(Number(row.residuo))}
                  {row.deadline_fiscale ? ` · differita entro ${formatInvoiceDate(row.deadline_fiscale)}` : ""}
                </p>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  className={dsTableActionBtnPrimary}
                  onClick={() => onGenerate(origineOf(row.source_type), row.source_id)}
                >
                  {row.source_type === "ddt" ? "Genera differita" : "Genera fattura"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ShellCard>
  );
}
