/** Anagrafica destinatario ordini fornitori — settings `system.destinatario_ordini_anagrafica`. */

import type { OrdineFornitoreDestinatarioAnagrafica } from "@/lib/ordini-fornitori/destinatario-snapshot";
import { ORDINE_FORNITORE_TELEFONO_DEFAULT } from "@/lib/ordini-fornitori/fornitore-snapshot";

export const OFFICINA_DESTINATARIO_ORDINI_MODULE = "system" as const;
export const OFFICINA_DESTINATARIO_ORDINI_KEY = "destinatario_ordini_anagrafica" as const;

export type OfficinaDestinatarioOrdiniSettings = {
  label: string;
  partitaIva: string;
  codiceFiscale: string;
  telefono: string;
};

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function emptyOfficinaDestinatarioOrdiniSettings(): OfficinaDestinatarioOrdiniSettings {
  return { label: "", partitaIva: "", codiceFiscale: "", telefono: "" };
}

export function parseOfficinaDestinatarioOrdiniSettings(value: unknown): OfficinaDestinatarioOrdiniSettings {
  if (!value || typeof value !== "object") return emptyOfficinaDestinatarioOrdiniSettings();
  const o = value as Record<string, unknown>;
  return {
    label: strField(o.label ?? o.ragioneSociale ?? o.ragione_sociale),
    partitaIva: strField(o.partitaIva ?? o.partita_iva),
    codiceFiscale: strField(o.codiceFiscale ?? o.codice_fiscale),
    telefono: strField(o.telefono),
  };
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readOfficinaDestinatarioOrdiniFromRows(
  rows: AppSettingsRowLike[] | undefined,
): OfficinaDestinatarioOrdiniSettings {
  if (!rows?.length) return emptyOfficinaDestinatarioOrdiniSettings();
  const row = rows.find(
    (r) => r.module === OFFICINA_DESTINATARIO_ORDINI_MODULE && r.key === OFFICINA_DESTINATARIO_ORDINI_KEY,
  );
  return parseOfficinaDestinatarioOrdiniSettings(row?.value);
}

export function isOfficinaDestinatarioOrdiniConfigured(settings: OfficinaDestinatarioOrdiniSettings): boolean {
  return Boolean(
    settings.label.trim() ||
      settings.partitaIva.trim() ||
      settings.codiceFiscale.trim() ||
      settings.telefono.trim(),
  );
}

export function officinaDestinatarioOrdiniToAnagrafica(
  settings: OfficinaDestinatarioOrdiniSettings,
  sedeOperativaLine: string,
): OrdineFornitoreDestinatarioAnagrafica {
  const telefono = settings.telefono.trim();
  return {
    label: settings.label.trim(),
    indirizzo: sedeOperativaLine.trim(),
    partitaIva: settings.partitaIva.trim(),
    codiceFiscale: settings.codiceFiscale.trim(),
    telefono: telefono || ORDINE_FORNITORE_TELEFONO_DEFAULT,
    bancaAppoggioNome: "",
    bancaAppoggioIban: "",
  };
}
