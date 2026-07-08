/** Sedi officina — settings `system.sede_legale` / `system.sede_operativa`. */

import { formatSedeLine } from "@/lib/clienti/format-sede-line";
import type { ClienteSedeFields } from "@/lib/clienti/clienti-anagrafica-types";
import {
  parseOfficinaIndirizzoMagazzino,
  readOfficinaIndirizzoMagazzinoFromRows,
} from "@/lib/officina/officina-indirizzo-magazzino";

export const OFFICINA_SEDE_MODULE = "system" as const;
export const OFFICINA_SEDE_LEGALE_KEY = "sede_legale" as const;
export const OFFICINA_SEDE_OPERATIVA_KEY = "sede_operativa" as const;

export type OfficinaSede = ClienteSedeFields;

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function emptyOfficinaSede(): OfficinaSede {
  return { via: "", numeroCivico: "", cap: "", citta: "", provincia: "", stato: "IT" };
}

export function parseOfficinaSede(value: unknown): OfficinaSede {
  if (!value || typeof value !== "object") return emptyOfficinaSede();
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

function readOfficinaSedeByKey(rows: AppSettingsRowLike[] | undefined, key: string): OfficinaSede {
  if (!rows?.length) return emptyOfficinaSede();
  const row = rows.find((r) => r.module === OFFICINA_SEDE_MODULE && r.key === key);
  return parseOfficinaSede(row?.value);
}

export function readOfficinaSedeLegaleFromRows(rows: AppSettingsRowLike[] | undefined): OfficinaSede {
  return readOfficinaSedeByKey(rows, OFFICINA_SEDE_LEGALE_KEY);
}

export function readOfficinaSedeOperativaFromRows(rows: AppSettingsRowLike[] | undefined): OfficinaSede {
  const operativa = readOfficinaSedeByKey(rows, OFFICINA_SEDE_OPERATIVA_KEY);
  if (isOfficinaSedeConfigured(operativa)) return operativa;
  // ponytail: legacy `indirizzo_magazzino` finché non migrato manualmente in impostazioni
  return parseOfficinaIndirizzoMagazzino(readOfficinaIndirizzoMagazzinoFromRows(rows));
}

export function formatOfficinaSede(fields: OfficinaSede): string {
  return formatSedeLine(fields).trim();
}

export function isOfficinaSedeConfigured(fields: OfficinaSede): boolean {
  return formatOfficinaSede(fields).length > 0;
}
