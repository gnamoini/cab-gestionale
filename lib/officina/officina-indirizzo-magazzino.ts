/** Indirizzo magazzino officina — settings `system.indirizzo_magazzino`. */

import { formatSedeLine } from "@/lib/clienti/format-sede-line";
import type { ClienteSedeFields } from "@/lib/clienti/clienti-anagrafica-types";

export const OFFICINA_INDIRIZZO_MAGAZZINO_MODULE = "system" as const;
export const OFFICINA_INDIRIZZO_MAGAZZINO_KEY = "indirizzo_magazzino" as const;

export type OfficinaIndirizzoMagazzino = ClienteSedeFields;

export function emptyOfficinaIndirizzoMagazzino(): OfficinaIndirizzoMagazzino {
  return { via: "", numeroCivico: "", cap: "", citta: "", provincia: "", stato: "IT" };
}

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseOfficinaIndirizzoMagazzino(value: unknown): OfficinaIndirizzoMagazzino {
  if (!value || typeof value !== "object") return emptyOfficinaIndirizzoMagazzino();
  const o = value as Record<string, unknown>;
  return {
    via: strField(o.via),
    numeroCivico: strField(o.numeroCivico ?? o.numero_civico),
    cap: strField(o.cap),
    citta: strField(o.citta),
    provincia: strField(o.provincia),
    stato: strField(o.stato) || "IT",
  };
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readOfficinaIndirizzoMagazzinoFromRows(
  rows: AppSettingsRowLike[] | undefined,
): OfficinaIndirizzoMagazzino {
  if (!rows?.length) return emptyOfficinaIndirizzoMagazzino();
  const row = rows.find(
    (r) => r.module === OFFICINA_INDIRIZZO_MAGAZZINO_MODULE && r.key === OFFICINA_INDIRIZZO_MAGAZZINO_KEY,
  );
  return parseOfficinaIndirizzoMagazzino(row?.value);
}

export function formatOfficinaIndirizzoMagazzino(fields: OfficinaIndirizzoMagazzino): string {
  return formatSedeLine(fields).trim();
}

export function isOfficinaIndirizzoMagazzinoConfigured(fields: OfficinaIndirizzoMagazzino): boolean {
  return formatOfficinaIndirizzoMagazzino(fields).length > 0;
}
