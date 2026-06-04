import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import type { RicambioFornitoreAlternativo } from "@/lib/magazzino/types";

const MAX_FORNITORI_ALTERNATIVI = 20;

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function newFornitoreAlternativoId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `alt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeFornitoreAlternativoRow(raw: unknown): RicambioFornitoreAlternativo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const fornitore = str(o.fornitore);
  const codiceRaw = str(o.codice);
  const codice = codiceRaw ? normalizeRicambioCodice(codiceRaw) : "";
  if (!fornitore && !codice && !str(o.produttore)) return null;
  const prezzo = Math.max(0, num(o.prezzo, 0));
  const sconto = Math.min(100, Math.max(0, num(o.sconto, 0)));
  const id = str(o.id) || newFornitoreAlternativoId();
  return {
    id,
    fornitore,
    produttore: str(o.produttore),
    codice,
    prezzo,
    sconto,
  };
}

export function parseFornitoriAlternativiMeta(raw: unknown): RicambioFornitoreAlternativo[] {
  if (!Array.isArray(raw)) return [];
  const out: RicambioFornitoreAlternativo[] = [];
  for (const item of raw) {
    const row = normalizeFornitoreAlternativoRow(item);
    if (row) out.push(row);
    if (out.length >= MAX_FORNITORI_ALTERNATIVI) break;
  }
  return out;
}

export function legacyFornitoreAlternativoFromMeta(meta: {
  fornitoreNonOriginale?: string;
  codiceFornitoreNonOriginale?: string;
  prezzoFornitoreNonOriginale?: number;
  scontoFornitoreNonOriginale?: number;
}): RicambioFornitoreAlternativo | null {
  const fornitore = str(meta.fornitoreNonOriginale);
  const codice = meta.codiceFornitoreNonOriginale?.trim()
    ? normalizeRicambioCodice(meta.codiceFornitoreNonOriginale)
    : "";
  const prezzo = Math.max(0, meta.prezzoFornitoreNonOriginale ?? 0);
  const sconto = Math.min(100, Math.max(0, meta.scontoFornitoreNonOriginale ?? 0));
  if (!fornitore && !codice && prezzo <= 0) return null;
  return {
    id: newFornitoreAlternativoId(),
    fornitore,
    produttore: "",
    codice,
    prezzo,
    sconto,
  };
}

export function resolveFornitoriAlternativiFromMeta(meta: {
  fornitoriAlternativi?: RicambioFornitoreAlternativo[];
  fornitoreNonOriginale?: string;
  codiceFornitoreNonOriginale?: string;
  prezzoFornitoreNonOriginale?: number;
  scontoFornitoreNonOriginale?: number;
}): RicambioFornitoreAlternativo[] {
  const fromArray = meta.fornitoriAlternativi ?? [];
  if (fromArray.length > 0) return fromArray;
  const legacy = legacyFornitoreAlternativoFromMeta(meta);
  return legacy ? [legacy] : [];
}

export function sanitizeFornitoriAlternativiForPersist(
  rows: RicambioFornitoreAlternativo[],
): RicambioFornitoreAlternativo[] {
  const out: RicambioFornitoreAlternativo[] = [];
  for (const row of rows) {
    const fornitore = row.fornitore.trim();
    const codice = row.codice.trim() ? normalizeRicambioCodice(row.codice) : "";
    const produttore = row.produttore.trim();
    const prezzo = Math.max(0, row.prezzo);
    const sconto = Math.min(100, Math.max(0, row.sconto));
    if (!fornitore && !codice && !produttore && prezzo <= 0) continue;
    out.push({
      id: row.id.trim() || newFornitoreAlternativoId(),
      fornitore,
      produttore,
      codice,
      prezzo,
      sconto,
    });
    if (out.length >= MAX_FORNITORI_ALTERNATIVI) break;
  }
  return out;
}

/** Sincronizza campi flat legacy dal primo fornitore alternativo (compat consumer vecchi). */
export function syncLegacyFornitoreFieldsFromAlternativi(
  rows: RicambioFornitoreAlternativo[],
): {
  fornitoreNonOriginale?: string;
  codiceFornitoreNonOriginale?: string;
  prezzoFornitoreNonOriginale?: number;
  scontoFornitoreNonOriginale?: number;
} {
  const first = rows[0];
  if (!first) return {};
  return {
    fornitoreNonOriginale: first.fornitore.trim() || undefined,
    codiceFornitoreNonOriginale: first.codice.trim()
      ? normalizeRicambioCodice(first.codice)
      : undefined,
    prezzoFornitoreNonOriginale: first.prezzo > 0 ? first.prezzo : undefined,
    scontoFornitoreNonOriginale: first.sconto > 0 ? first.sconto : undefined,
  };
}

export function syncFlatFornitoreFieldsOnRicambio(
  r: Pick<
    import("@/lib/magazzino/types").RicambioMagazzino,
    | "fornitoriAlternativi"
    | "fornitoreNonOriginale"
    | "codiceFornitoreNonOriginale"
    | "prezzoFornitoreNonOriginale"
    | "scontoFornitoreNonOriginale"
  >,
): void {
  const first = r.fornitoriAlternativi[0];
  if (!first) {
    r.fornitoreNonOriginale = "";
    r.codiceFornitoreNonOriginale = "";
    r.prezzoFornitoreNonOriginale = 0;
    r.scontoFornitoreNonOriginale = 0;
    return;
  }
  r.fornitoreNonOriginale = first.fornitore;
  r.codiceFornitoreNonOriginale = first.codice;
  r.prezzoFornitoreNonOriginale = first.prezzo;
  r.scontoFornitoreNonOriginale = first.sconto;
}

export function allCodiciFornitoriAlternativi(rows: RicambioFornitoreAlternativo[]): string[] {
  return rows.map((r) => r.codice.trim()).filter(Boolean);
}

export function ricambioHasFornitoreAlternativo(
  r: Pick<
    import("@/lib/magazzino/types").RicambioMagazzino,
    "fornitoreNonOriginale" | "fornitoriAlternativi"
  >,
  fornitore: string,
): boolean {
  const f = fornitore.trim();
  if (!f) return false;
  if (r.fornitoreNonOriginale.trim() === f) return true;
  return (r.fornitoriAlternativi ?? []).some((a) => a.fornitore.trim() === f);
}

export function patchFornitoriAlternativiFornitoreRename(
  meta: unknown,
  from: string,
  to: string,
): { next: Record<string, unknown>; changed: boolean } {
  const base =
    meta && typeof meta === "object" && !Array.isArray(meta) ? { ...(meta as Record<string, unknown>) } : {};
  const fromTrim = from.trim();
  const toTrim = to.trim();
  if (!fromTrim || !toTrim || fromTrim === toTrim) return { next: base, changed: false };

  let changed = false;
  const raw = base.fornitoriAlternativi;
  if (Array.isArray(raw) && raw.length > 0) {
    const nextRows = raw.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const row = { ...(item as Record<string, unknown>) };
      if (typeof row.fornitore === "string" && row.fornitore.trim() === fromTrim) {
        changed = true;
        return { ...row, fornitore: toTrim };
      }
      return item;
    });
    if (changed) base.fornitoriAlternativi = nextRows;
  }

  if (typeof base.fornitoreNonOriginale === "string" && base.fornitoreNonOriginale.trim() === fromTrim) {
    base.fornitoreNonOriginale = toTrim;
    changed = true;
  }

  return { next: base, changed };
}
