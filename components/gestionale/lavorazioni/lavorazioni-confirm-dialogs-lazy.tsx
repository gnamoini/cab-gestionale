"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

export const LavorazioneConcludiConfirmDialogLazy = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazione-concludi-confirm-dialog").then((m) => ({
      default: m.LavorazioneConcludiConfirmDialog,
    })),
  { ssr: false },
);

export const LavorazioneEliminaConfirmDialogLazy = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazione-elimina-confirm-dialog").then((m) => ({
      default: m.LavorazioneEliminaConfirmDialog,
    })),
  { ssr: false },
);

export type LavorazioneConcludiConfirmDialogLazyProps = ComponentProps<typeof LavorazioneConcludiConfirmDialogLazy>;
export type LavorazioneEliminaConfirmDialogLazyProps = ComponentProps<typeof LavorazioneEliminaConfirmDialogLazy>;
