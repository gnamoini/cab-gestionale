import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { normFornitoreAlternativoKey } from "@/lib/magazzino/fornitore-alternativo-sconto";
import type { OrdineFornitoreFornitoreSnapshot } from "@/lib/ordini-fornitori/fornitore-snapshot";
import { ORDINE_FORNITORE_TELEFONO_DEFAULT } from "@/lib/ordini-fornitori/fornitore-snapshot";

export type FornitoreAnagraficaSettings = {
  ragioneSociale: string;
  indirizzo: string;
  partitaIva: string;
  codiceFiscale: string;
  telefono: string;
};

export function emptyFornitoreAnagraficaSettings(): FornitoreAnagraficaSettings {
  return { ragioneSociale: "", indirizzo: "", partitaIva: "", codiceFiscale: "", telefono: "" };
}

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseFornitoreAnagraficaSettings(raw: unknown): FornitoreAnagraficaSettings {
  if (!raw || typeof raw !== "object") return emptyFornitoreAnagraficaSettings();
  const o = raw as Record<string, unknown>;
  return {
    ragioneSociale: strField(o.ragioneSociale ?? o.ragione_sociale),
    indirizzo: strField(o.indirizzo),
    partitaIva: strField(o.partitaIva ?? o.partita_iva),
    codiceFiscale: strField(o.codiceFiscale ?? o.codice_fiscale),
    telefono: strField(o.telefono),
  };
}

export function parseFornitoreAnagraficaByFornitore(raw: unknown): Record<string, FornitoreAnagraficaSettings> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, FornitoreAnagraficaSettings> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = normFornitoreAlternativoKey(k);
    if (!key) continue;
    out[key] = parseFornitoreAnagraficaSettings(v);
  }
  return out;
}

export function getFornitoreAnagraficaSettings(
  mag: MagazzinoMasterPrefs,
  fornitoreNome: string,
): FornitoreAnagraficaSettings {
  const key = normFornitoreAlternativoKey(fornitoreNome);
  if (!key) return emptyFornitoreAnagraficaSettings();
  return mag.fornitoreAnagraficaByFornitore?.[key] ?? emptyFornitoreAnagraficaSettings();
}

export function setFornitoreAnagraficaSettings(
  mag: MagazzinoMasterPrefs,
  fornitoreNome: string,
  patch: Partial<FornitoreAnagraficaSettings>,
): MagazzinoMasterPrefs {
  const key = normFornitoreAlternativoKey(fornitoreNome);
  if (!key) return mag;
  const current = getFornitoreAnagraficaSettings(mag, fornitoreNome);
  const next: FornitoreAnagraficaSettings = { ...current, ...patch };
  return {
    ...mag,
    fornitoreAnagraficaByFornitore: {
      ...(mag.fornitoreAnagraficaByFornitore ?? {}),
      [key]: next,
    },
  };
}

export function renameFornitoreAnagraficaInMagazzinoMaster(
  mag: MagazzinoMasterPrefs,
  from: string,
  to: string,
): MagazzinoMasterPrefs {
  const oldKey = normFornitoreAlternativoKey(from);
  const newKey = normFornitoreAlternativoKey(to);
  if (!oldKey || !newKey || oldKey === newKey) return mag;
  const map = { ...(mag.fornitoreAnagraficaByFornitore ?? {}) };
  if (oldKey in map) {
    map[newKey] = map[oldKey]!;
    delete map[oldKey];
  }
  return { ...mag, fornitoreAnagraficaByFornitore: map };
}

export function removeFornitoreAnagraficaFromMagazzinoMaster(
  mag: MagazzinoMasterPrefs,
  fornitoreNome: string,
): MagazzinoMasterPrefs {
  const key = normFornitoreAlternativoKey(fornitoreNome);
  if (!key || !mag.fornitoreAnagraficaByFornitore) return mag;
  const next = { ...mag.fornitoreAnagraficaByFornitore };
  delete next[key];
  return { ...mag, fornitoreAnagraficaByFornitore: next };
}

export function fornitoreAnagraficaToOrdineSnapshot(
  label: string,
  anagrafica: FornitoreAnagraficaSettings,
): OrdineFornitoreFornitoreSnapshot {
  return {
    label: label.trim(),
    ragioneSociale: anagrafica.ragioneSociale.trim() || label.trim(),
    indirizzo: anagrafica.indirizzo.trim(),
    partitaIva: anagrafica.partitaIva.trim(),
    codiceFiscale: anagrafica.codiceFiscale.trim(),
    telefono: anagrafica.telefono.trim() || ORDINE_FORNITORE_TELEFONO_DEFAULT,
  };
}

export function isFornitoreAnagraficaConfigured(anagrafica: FornitoreAnagraficaSettings): boolean {
  return Boolean(
    anagrafica.ragioneSociale.trim() ||
      anagrafica.indirizzo.trim() ||
      anagrafica.partitaIva.trim() ||
      anagrafica.codiceFiscale.trim() ||
      anagrafica.telefono.trim(),
  );
}
