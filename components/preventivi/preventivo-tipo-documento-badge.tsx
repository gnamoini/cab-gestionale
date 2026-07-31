"use client";

import { Tooltip } from "@/components/design-system";
import {
  preventivoTipoDocumentoBadgeClass,
  preventivoTipoDocumentoLabel,
  type PreventivoTipoDocumento,
  type PreventivoTipoDocumentoBadgeVariant,
} from "@/lib/preventivi/preventivi-tipo-documento";

export function PreventivoTipoDocumentoBadge({
  tipo,
  variant = "table",
}: {
  tipo: PreventivoTipoDocumento;
  variant?: PreventivoTipoDocumentoBadgeVariant;
}) {
  const title = preventivoTipoDocumentoLabel(tipo);
  const chip = preventivoTipoDocumentoLabel(tipo, variant === "table" ? "chip" : "short");
  return (
    <Tooltip content={title}>
      <span className={preventivoTipoDocumentoBadgeClass(tipo, variant)} aria-label={title}>
        {chip}
      </span>
    </Tooltip>
  );
}
