"use client";

import { useCallback, useState } from "react";
import {
  LavorazioniModalHeader,
  LavorazioniModalShell,
  LavorazioniModalTitleBar,
} from "@/components/gestionale/lavorazioni/lavorazioni-modals";

export {
  LavorazioniModalShell as GestionaleModalShell,
  LavorazioniModalHeader as GestionaleModalHeader,
  LavorazioniModalTitleBar as GestionaleModalTitleBar,
};

/** Stato open/close per modali gestionale. Lo scroll lock è gestito da `GestionaleModalShell`. */
export function useGestionaleModal(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  return { open, isOpen: open, setOpen, onOpen, onClose };
}
