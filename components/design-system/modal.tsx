"use client";

import { type ReactNode } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal-shell";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import type { GestionaleModalWidth, ModalSize } from "@/lib/ui/modal-max-width-class";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Categoria semantica — SSOT dimensioni. */
  modalSize?: ModalSize;
  /** @deprecated Usare `modalSize`. */
  size?: GestionaleModalWidth;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  modalSize = "formMedium",
}: ModalProps) {
  if (!open) return null;

  return (
    <GestionaleModalShell
      modalSize={modalSize}
      onRequestClose={onClose}
      title={title}
      titleId="ds-modal-title"
      footer={footer}
    >
      <GestionaleModalScrollBody>{children}</GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
