"use client";

import { MezziTagliandiMatrixTable } from "@/components/gestionale/mezzi/mezzi-tagliandi-matrix-table";

export function MezziTagliandiPanel({ canEdit }: { canEdit: boolean }) {
  return <MezziTagliandiMatrixTable enabled canEdit={canEdit} />;
}
