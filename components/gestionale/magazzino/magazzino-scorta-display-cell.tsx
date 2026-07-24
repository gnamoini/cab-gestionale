"use client";

import { MagazzinoScortaBadge } from "@/components/gestionale/magazzino/magazzino-scorta-badge";
import { useMagazzinoDebouncedScortaQuantity } from "@/components/gestionale/magazzino/magazzino-debounced-scorta-context";
import { MagazzinoScortaStatusIndicator } from "@/components/gestionale/magazzino/magazzino-scorta-status-indicator";

/** Giacenza riga — display debounced ottimistico. */
export function MagazzinoScortaDisplayBadge({
  ricambioId,
  ricambioLabel,
  fallbackScorta,
  low,
  variant = "table",
}: {
  ricambioId: string;
  ricambioLabel: string;
  fallbackScorta: number;
  low: boolean;
  variant?: "mobile" | "table";
}) {
  const { displayQuantity, isCommitting, showSuccess } = useMagazzinoDebouncedScortaQuantity({
    ricambioId,
    ricambioLabel,
    fallbackScorta,
  });

  return (
    <span className="inline-flex items-center justify-center gap-1">
      <MagazzinoScortaBadge value={displayQuantity} low={low} variant={variant} />
      <MagazzinoScortaStatusIndicator isCommitting={isCommitting} showSuccess={showSuccess} />
    </span>
  );
}
