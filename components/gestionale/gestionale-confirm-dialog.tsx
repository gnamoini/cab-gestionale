"use client";

import dynamic from "next/dynamic";

export { gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog-styles";

/** Lazy-by-default — confirm chunk caricato al primo open. */
export const GestionaleConfirmDialog = dynamic(
  () =>
    import("@/components/gestionale/gestionale-confirm-dialog-impl").then((m) => ({
      default: m.GestionaleConfirmDialog,
    })),
  { ssr: false },
);
