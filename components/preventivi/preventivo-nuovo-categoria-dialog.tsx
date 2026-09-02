"use client";

import { GestionaleModalFooterCancelButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { PreventivoCategoriaPicker } from "@/components/preventivi/preventivo-categoria-picker";
import type { PreventivoCategoria } from "@/lib/preventivi/types";

export function PreventivoNuovoCategoriaDialog({
  open,
  onCancel,
  onSelect,
}: {
  open: boolean;
  onCancel: () => void;
  onSelect: (categoria: PreventivoCategoria) => void;
}) {
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Nuovo preventivo"
      subtitle="Scegli il contesto del documento"
      footer={<GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={onCancel} />}
      onCancel={onCancel}
    >
      <PreventivoCategoriaPicker onSelect={onSelect} />
    </GestionaleConfirmDialog>
  );
}
