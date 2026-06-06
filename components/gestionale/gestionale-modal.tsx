"use client";

import { useCallback, useState } from "react";
import {
  LavorazioniModalHeader,
  LavorazioniModalShell,
  LavorazioniModalTitleBar,
} from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";

export {
  LavorazioniModalShell as GestionaleModalShell,
  LavorazioniModalHeader as GestionaleModalHeader,
  LavorazioniModalTitleBar as GestionaleModalTitleBar,
  GestionaleModalScrollBody,
};

export type { GestionaleModalWidth } from "@/lib/ui/modal-max-width-class";

/** Stato open/close per modali gestionale. Lo scroll lock è gestito da `GestionaleModalShell`. */
export function useGestionaleModal(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  return { open, isOpen: open, setOpen, onOpen, onClose };
}
