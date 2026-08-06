import type { SearchFieldKind } from "@/lib/search/types";
import { normalizeEntityString } from "@/lib/validation/global-entity-validation";

/** Marker campo in search_document — SSOT con SQL format_field_search_token. */
export type SearchFieldMarker =
  | "codice"
  | "codice_alt"
  | "targa"
  | "telaio"
  | "cliente"
  | "descrizione"
  | "note"
  | "marca"
  | "document"
  | "matricola"
  | "modello"
  | "categoria"
  | "ubicazione"
  | "operatore"
  | "generic";

/** Chiave alfanumerica pura — allineata a SQL collapse_search_text (no fold c→k). */
export function collapseSearchKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function fieldKindToMarker(kind: SearchFieldKind, alt = false): SearchFieldMarker {
  if (alt && kind === "code") return "codice_alt";
  switch (kind) {
    case "code":
      return "codice";
    case "plate":
      return "targa";
    case "customer":
      return "cliente";
    case "description":
      return "descrizione";
    case "note":
      return "note";
    case "brand":
      return "marca";
    case "document":
      return "document";
    case "model":
      return "modello";
    case "category":
      return "categoria";
    case "location":
      return "ubicazione";
    case "operator":
      return "operatore";
    default:
      return "generic";
  }
}

/** Token indicizzato `field:collapsed` — evita collisioni cross-campo. */
export function formatFieldSearchToken(marker: SearchFieldMarker | string, value: string): string {
  const collapsed = collapseSearchKey(value);
  if (!collapsed) return "";
  return `${marker}:${collapsed}`;
}

export type FieldSearchEntry = {
  kind: SearchFieldKind;
  value: string | null | undefined;
  /** Codice alternativo/secondario → marker codice_alt */
  alt?: boolean;
};

/** Token leggibile + marker campo per un valore indicizzato. */
export function buildTokensFromFieldEntry(entry: FieldSearchEntry): string[] {
  const v = typeof entry.value === "string" ? entry.value.trim() : "";
  if (!v) return [];
  const out: string[] = [];
  const spaced = normalizeEntityString(v);
  if (spaced) out.push(spaced);
  const marked = formatFieldSearchToken(fieldKindToMarker(entry.kind, entry.alt), v);
  if (marked) out.push(marked);
  return out;
}

export function buildSearchDocumentFromFieldEntries(
  entries: readonly FieldSearchEntry[],
  extraParts?: readonly (string | null | undefined)[],
): string {
  const tokens: string[] = [];
  for (const entry of entries) tokens.push(...buildTokensFromFieldEntry(entry));
  if (extraParts?.length) {
    for (const part of extraParts) {
      if (typeof part !== "string") continue;
      const spaced = normalizeEntityString(part);
      if (spaced) tokens.push(spaced);
    }
  }
  return tokens.filter(Boolean).join(" ");
}
