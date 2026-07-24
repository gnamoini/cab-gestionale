"use client";

import { MagazzinoScortaAdjustActions } from "@/components/gestionale/magazzino/magazzino-scorta-adjust-actions";
import { useMagazzinoDebouncedScortaQuantity } from "@/components/gestionale/magazzino/magazzino-debounced-scorta-context";

export function MagazzinoScortaAdjustActionsCell({
  ricambioId,
  ricambioLabel,
  fallbackScorta,
  canAdjust,
  modalitaModifica,
}: {
  ricambioId: string;
  ricambioLabel: string;
  fallbackScorta: number;
  canAdjust: boolean;
  modalitaModifica?: boolean;
}) {
  const { increment, decrement } = useMagazzinoDebouncedScortaQuantity({
    ricambioId,
    ricambioLabel,
    fallbackScorta,
  });

  return (
    <MagazzinoScortaAdjustActions
      canAdjust={canAdjust}
      modalitaModifica={modalitaModifica}
      onDecrease={decrement}
      onIncrease={increment}
    />
  );
}
