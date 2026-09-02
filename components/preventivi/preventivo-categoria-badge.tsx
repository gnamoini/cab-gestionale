"use client";

import { Tooltip } from "@/components/ui";
import {
  preventivoCategoriaBadgeClass,
  preventivoCategoriaBadgeLabel,
  preventivoCategoriaNuovoLabel,
  resolvePreventivoCategoriaFromRecord,
  type PreventivoCategoria,
  type PreventivoCategoriaBadgeVariant,
} from "@/lib/preventivi/preventivo-categoria";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export function PreventivoCategoriaBadge({
  categoria,
  variant = "table",
}: {
  categoria: PreventivoCategoria;
  variant?: PreventivoCategoriaBadgeVariant;
}) {
  const title = preventivoCategoriaNuovoLabel(categoria);
  const chip = preventivoCategoriaBadgeLabel(categoria, variant === "table" ? "chip" : "short");
  return (
    <Tooltip content={title}>
      <span className={preventivoCategoriaBadgeClass(categoria, variant)} aria-label={title}>
        {chip}
      </span>
    </Tooltip>
  );
}

export function PreventivoCategoriaBadgeFromRecord({
  record,
  variant = "table",
}: {
  record: PreventivoRecord;
  variant?: PreventivoCategoriaBadgeVariant;
}) {
  return <PreventivoCategoriaBadge categoria={resolvePreventivoCategoriaFromRecord(record)} variant={variant} />;
}
