import { normalizePreventivoTipoDocumento } from "@/lib/preventivi/preventivi-tipo-documento";
import type { CabDocumentType } from "@/lib/integrations/unoerp/types";
import type { PreventivoRow } from "@/src/types/supabase-tables";

export function cabDocumentTypeFromPreventivoRow(row: PreventivoRow): CabDocumentType {
  const raw = row.dettagli && typeof row.dettagli === "object" ? (row.dettagli as { tipoDocumento?: unknown }).tipoDocumento : null;
  return normalizePreventivoTipoDocumento(raw);
}

export function sourceVersionFromUpdatedAt(updatedAt: string, versione?: number): number {
  const t = Date.parse(updatedAt);
  const base = Number.isFinite(t) ? t : Date.now();
  return base + (versione ?? 0);
}
