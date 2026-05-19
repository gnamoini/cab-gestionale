import type { RicambioMagazzino } from "@/lib/magazzino/types";

export type MagazzinoRicambioMeta = {
  note?: string;
  categoria?: string;
  compatibilitaMezzi?: string[];
  scortaMinima?: number;
  scontoFornitoreOriginale?: number;
  fornitoreNonOriginale?: string;
  codiceFornitoreNonOriginale?: string;
  prezzoFornitoreNonOriginale?: number;
  scontoFornitoreNonOriginale?: number;
};

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

export function parseMagazzinoRicambioMeta(raw: unknown): MagazzinoRicambioMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const m = raw as Record<string, unknown>;
  const compat = strArray(m.compatibilitaMezzi);
  const scortaMinima = num(m.scortaMinima, NaN);
  return {
    note: str(m.note) || undefined,
    categoria: str(m.categoria) || undefined,
    compatibilitaMezzi: compat.length ? compat : undefined,
    scortaMinima: Number.isFinite(scortaMinima) ? Math.max(0, scortaMinima) : undefined,
    scontoFornitoreOriginale: num(m.scontoFornitoreOriginale, NaN) || undefined,
    fornitoreNonOriginale: str(m.fornitoreNonOriginale) || undefined,
    codiceFornitoreNonOriginale: str(m.codiceFornitoreNonOriginale) || undefined,
    prezzoFornitoreNonOriginale: num(m.prezzoFornitoreNonOriginale, NaN) || undefined,
    scontoFornitoreNonOriginale: num(m.scontoFornitoreNonOriginale, NaN) || undefined,
  };
}

export function ricambioUiToMagazzinoMeta(r: RicambioMagazzino): MagazzinoRicambioMeta {
  const compat = r.compatibilitaMezzi.map((x) => x.trim()).filter(Boolean);
  return {
    note: r.note.trim() || undefined,
    categoria: r.categoria.trim() || undefined,
    compatibilitaMezzi: compat.length ? compat : undefined,
    scortaMinima: Math.max(0, r.scortaMinima),
    scontoFornitoreOriginale: r.scontoFornitoreOriginale > 0 ? r.scontoFornitoreOriginale : undefined,
    fornitoreNonOriginale: r.fornitoreNonOriginale.trim() || undefined,
    codiceFornitoreNonOriginale: r.codiceFornitoreNonOriginale.trim() || undefined,
    prezzoFornitoreNonOriginale: r.prezzoFornitoreNonOriginale > 0 ? r.prezzoFornitoreNonOriginale : undefined,
    scontoFornitoreNonOriginale: r.scontoFornitoreNonOriginale > 0 ? r.scontoFornitoreNonOriginale : undefined,
  };
}

export function metaFieldsToRicambioUi(meta: MagazzinoRicambioMeta): Pick<
  RicambioMagazzino,
  | "note"
  | "categoria"
  | "compatibilitaMezzi"
  | "scortaMinima"
  | "scontoFornitoreOriginale"
  | "fornitoreNonOriginale"
  | "codiceFornitoreNonOriginale"
  | "prezzoFornitoreNonOriginale"
  | "scontoFornitoreNonOriginale"
> {
  return {
    note: meta.note ?? "",
    categoria: meta.categoria?.trim() || "Generale",
    compatibilitaMezzi: meta.compatibilitaMezzi ?? [],
    scortaMinima: Math.max(0, meta.scortaMinima ?? 0),
    scontoFornitoreOriginale: Math.min(100, Math.max(0, meta.scontoFornitoreOriginale ?? 0)),
    fornitoreNonOriginale: meta.fornitoreNonOriginale ?? "",
    codiceFornitoreNonOriginale: meta.codiceFornitoreNonOriginale ?? "",
    prezzoFornitoreNonOriginale: Math.max(0, meta.prezzoFornitoreNonOriginale ?? 0),
    scontoFornitoreNonOriginale: Math.min(100, Math.max(0, meta.scontoFornitoreNonOriginale ?? 0)),
  };
}
