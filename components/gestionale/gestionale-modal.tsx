"use client";

import { useCallback, useState } from "react";
import {
  GestionaleModalHeader,
  GestionaleModalShell,
  GestionaleModalTitleBar,
} from "@/components/gestionale/gestionale-modal-shell";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";

export {
  GestionaleModalShell,
  GestionaleModalHeader,
  GestionaleModalTitleBar,
  GestionaleModalScrollBody,
};

export type { GestionaleModalWidth, ModalHeight, ModalSize } from "@/lib/ui/modal-max-width-class";

/** Stato open/close per modali gestionale. Lo scroll lock è gestito da `GestionaleModalShell`. */
export function useGestionaleModal(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  return { open, isOpen: open, setOpen, onOpen, onClose };
}
