"use client";

import { MagazzinoScortaBadge } from "@/components/gestionale/magazzino/magazzino-scorta-badge";
import { useStockDisplayState } from "@/src/hooks/gestionale/use-stock-adjust-mutation";

/** Giacenza riga — certified + pending journal (v4). */
export function MagazzinoScortaDisplayBadge({
  ricambioId,
  fallbackScorta,
  low,
  variant = "table",
}: {
  ricambioId: string;
  fallbackScorta: number;
  low: boolean;
  variant?: "mobile" | "table";
}) {
  const display = useStockDisplayState(ricambioId);
  const value = display.certifiedQuantita > 0 || display.isPending ? display.displayQuantita : fallbackScorta;
  return (
    <span className={display.isPending ? "opacity-80" : undefined} title={display.isPending ? "Aggiornamento in corso" : undefined}>
      <MagazzinoScortaBadge value={value} low={low} variant={variant} />
    </span>
  );
}
