"use client";

import { MagazzinoScortaAdjustActions } from "@/components/gestionale/magazzino/magazzino-scorta-adjust-actions";
import { useStockRicambioPending } from "@/src/hooks/gestionale/use-stock-adjust-mutation";

export function MagazzinoScortaAdjustActionsCell({
  ricambioId,
  canAdjust,
  modalitaModifica,
  onDecrease,
  onIncrease,
}: {
  ricambioId: string;
  canAdjust: boolean;
  modalitaModifica?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const pending = useStockRicambioPending(ricambioId);
  return (
    <MagazzinoScortaAdjustActions
      canAdjust={canAdjust}
      modalitaModifica={modalitaModifica}
      pending={pending}
      onDecrease={onDecrease}
      onIncrease={onIncrease}
    />
  );
}
