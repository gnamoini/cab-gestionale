import { buildEntityKey, normalizeEntityString } from "@/lib/validation/global-entity-validation";
import type { MezzoInsert } from "@/src/services/mezzi.service";
import type { MagazzinoInsert } from "@/src/services/magazzino.service";

export type EntityValidationContext =
  | "cliente"
  | "cantiere"
  | "utilizzatore"
  | "marca_attrezzatura"
  | "modello_attrezzatura"
  | "marca_telaio"
  | "modello_telaio"
  | "ricambio_codice"
  | "ricambio_marca"
  | "ricambio_nome"
  | "mezzo_ident";

const CLIENTE_SUFFIX_OPTS = { standardizeLegalSuffix: true as const };

export function buildClienteEntityKey(name: string): string {
  return buildEntityKey(name, "cliente", CLIENTE_SUFFIX_OPTS);
}

export function buildNamedListEntityKey(name: string, context: EntityValidationContext): string {
  const useLegal =
    context === "cliente" || context === "utilizzatore" || context === "cantiere";
  return buildEntityKey(name, context, useLegal ? CLIENTE_SUFFIX_OPTS : undefined);
}

export function buildMezzoIdentEntityKey(targa?: string | null, matricola?: string | null): string | null {
  const ident = targa?.trim() || matricola?.trim();
  if (!ident) return null;
  return buildEntityKey(ident, "mezzo_ident");
}

/** Chiave persistenza mezzo: identità targa/matricola, altrimenti cliente+marca+modello. */
export function buildMezzoPersistEntityKey(data: Pick<MezzoInsert, "cliente" | "marca" | "modello" | "targa" | "matricola">): string | null {
  const identKey = buildMezzoIdentEntityKey(data.targa, data.matricola);
  if (identKey) return identKey;
  const cliente = data.cliente?.trim();
  const marca = data.marca?.trim();
  const modello = data.modello?.trim();
  if (!cliente || !marca) return null;
  const composite = [cliente, marca, modello && modello !== "—" ? modello : ""].filter(Boolean).join(" ");
  return buildEntityKey(composite, "mezzo");
}

export function buildRicambioCodiceEntityKey(codice: string): string | null {
  const key = buildEntityKey(codice, "ricambio_codice");
  return key || null;
}

export function buildRicambioPersistEntityKey(data: Pick<MagazzinoInsert, "codice">): string | null {
  return buildRicambioCodiceEntityKey(data.codice);
}

/** Haystack normalizzato per ricerca accent/case insensitive. */
export function buildNormalizedSearchHaystack(parts: readonly (string | null | undefined)[]): string {
  return parts
    .map((p) => (typeof p === "string" ? normalizeEntityString(p) : ""))
    .filter(Boolean)
    .join(" ");
}
