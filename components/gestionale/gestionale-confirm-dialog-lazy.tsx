"use client";

import dynamic from "next/dynamic";

export const GestionaleConfirmDialogLazy = dynamic(
  () => import("@/components/gestionale/gestionale-confirm-dialog").then((m) => m.GestionaleConfirmDialog),
  { ssr: false },
);
