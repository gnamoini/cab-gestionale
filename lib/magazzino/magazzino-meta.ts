import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import {
  legacyFornitoreAlternativoFromMeta,
  parseFornitoriAlternativiMeta,
  resolveFornitoriAlternativiFromMeta,
  sanitizeFornitoriAlternativiForPersist,
  syncLegacyFornitoreFieldsFromAlternativi,
  syncFlatFornitoreFieldsOnRicambio,
} from "@/lib/magazzino/ricambio-fornitori-alternativi";
import type { RicambioFornitoreAlternativo, RicambioMagazzino } from "@/lib/magazzino/types";
import { writeCompatibilitaRicambio } from "@/lib/magazzino/compat/compat-write-gate";
import {
  parseCompatRefs,
  type RicambioCompatRef,
} from "@/lib/magazzino/ricambio-compat-resolver";
import {
  parseListinoImportMeta,
  type ListinoImportMeta,
} from "@/lib/magazzino/listino-import/listino-import-meta";
import {
  parseRicambioUnitaMisura,
  type RicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";

export type MagazzinoRicambioMeta = {
  note?: string;
  categoria?: string;
  compatibilitaMezzi?: string[];
  compatibilitaRefs?: RicambioCompatRef[];
  codiceOriginaleSecondario?: string;
  marcaOriginaleSecondaria?: string;
  usatoInTagliandi?: boolean;
  unitaMisura?: RicambioUnitaMisura;
  scortaMinima?: number;
  scontoFornitoreOriginale?: number;
  fornitoriAlternativi?: RicambioFornitoreAlternativo[];
  fornitoreNonOriginale?: string;
  codiceFornitoreNonOriginale?: string;
  prezzoFornitoreNonOriginale?: number;
  scontoFornitoreNonOriginale?: number;
  /** Nome operatore che ha effettuato l'ultima modifica ai dati ricambio. */
  autoreUltimaModifica?: string;
  /** Ricambio creato da import listino documenti. */
  listinoImport?: ListinoImportMeta;
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
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x && x !== "—");
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1 || v === "1") return true;
  if (v === "false" || v === 0 || v === "0") return false;
  return undefined;
}

export function parseMagazzinoRicambioMeta(raw: unknown): MagazzinoRicambioMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const m = raw as Record<string, unknown>;
  const compat = strArray(m.compatibilitaMezzi);
  const refs = parseCompatRefs(m.compatibilitaRefs);
  const scortaMinima = num(m.scortaMinima, NaN);
  const codiceSecondario = str(m.codiceOriginaleSecondario);
  const fornitoriParsed = parseFornitoriAlternativiMeta(m.fornitoriAlternativi);

  const legacyFlat = {
    fornitoreNonOriginale: str(m.fornitoreNonOriginale) || undefined,
    codiceFornitoreNonOriginale: (() => {
      const c = str(m.codiceFornitoreNonOriginale);
      return c ? normalizeRicambioCodice(c) : undefined;
    })(),
    prezzoFornitoreNonOriginale: num(m.prezzoFornitoreNonOriginale, NaN) || undefined,
    scontoFornitoreNonOriginale: num(m.scontoFornitoreNonOriginale, NaN) || undefined,
  };

  const fornitoriAlternativi = resolveFornitoriAlternativiFromMeta({
    fornitoriAlternativi: fornitoriParsed,
    ...legacyFlat,
  });

  const usatoInTagliandi = bool(m.usatoInTagliandi);

  return {
    note: str(m.note) || undefined,
    categoria: str(m.categoria) || undefined,
    compatibilitaMezzi: compat.length ? compat : undefined,
    compatibilitaRefs: refs.length ? refs : undefined,
    codiceOriginaleSecondario: codiceSecondario ? normalizeRicambioCodice(codiceSecondario) : undefined,
    marcaOriginaleSecondaria: str(m.marcaOriginaleSecondaria) || undefined,
    usatoInTagliandi: usatoInTagliandi ?? undefined,
    unitaMisura: parseRicambioUnitaMisura(m.unitaMisura),
    scortaMinima: Number.isFinite(scortaMinima) ? Math.max(0, scortaMinima) : undefined,
    scontoFornitoreOriginale: num(m.scontoFornitoreOriginale, NaN) || undefined,
    fornitoriAlternativi: fornitoriAlternativi.length ? fornitoriAlternativi : undefined,
    ...legacyFlat,
    autoreUltimaModifica: str(m.autoreUltimaModifica) || undefined,
    listinoImport: parseListinoImportMeta(m.listinoImport),
  };
}

export function ricambioUiToMagazzinoMeta(
  r: RicambioMagazzino,
  mezziListe?: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs,
): MagazzinoRicambioMeta {
  const compatMeta = writeCompatibilitaRicambio(
    {
      compatibilitaMezzi: r.compatibilitaMezzi,
      compatibilitaRefs: r.compatibilitaRefs,
      ricambioId: r.id,
    },
    mezziListe,
    "magazzino-meta.ricambioUiToMagazzinoMeta",
  );

  const compat = compatMeta.compatibilitaMezzi?.map((x) => x.trim()).filter((x) => x && x !== "—") ?? [];
  const codiceSecondario = r.codiceFornitoreOriginaleSecondario.trim();
  const fornitoriAlternativi = sanitizeFornitoriAlternativiForPersist(r.fornitoriAlternativi ?? []);
  const legacySync = syncLegacyFornitoreFieldsFromAlternativi(fornitoriAlternativi);

  return {
    note: r.note.trim() || undefined,
    categoria: r.categoria.trim() || undefined,
    compatibilitaMezzi: compat.length ? compat : undefined,
    compatibilitaRefs: compatMeta.compatibilitaRefs,
    codiceOriginaleSecondario: codiceSecondario ? normalizeRicambioCodice(codiceSecondario) : undefined,
    marcaOriginaleSecondaria: r.marcaOriginaleSecondaria.trim() || undefined,
    usatoInTagliandi: r.usatoInTagliandi ? true : undefined,
    unitaMisura: r.unitaMisura !== "pz" ? r.unitaMisura : undefined,
    scortaMinima: Math.max(0, r.scortaMinima),
    scontoFornitoreOriginale: r.scontoFornitoreOriginale > 0 ? r.scontoFornitoreOriginale : undefined,
    fornitoriAlternativi: fornitoriAlternativi.length ? fornitoriAlternativi : undefined,
    ...legacySync,
    autoreUltimaModifica: r.autoreUltimaModifica.trim() || undefined,
    listinoImport: r.listinoImport,
  };
}

export function metaFieldsToRicambioUi(meta: MagazzinoRicambioMeta): Pick<
  RicambioMagazzino,
  | "note"
  | "categoria"
  | "compatibilitaMezzi"
  | "compatibilitaRefs"
  | "codiceFornitoreOriginaleSecondario"
  | "marcaOriginaleSecondaria"
  | "usatoInTagliandi"
  | "unitaMisura"
  | "scortaMinima"
  | "scontoFornitoreOriginale"
  | "fornitoriAlternativi"
  | "fornitoreNonOriginale"
  | "codiceFornitoreNonOriginale"
  | "prezzoFornitoreNonOriginale"
  | "scontoFornitoreNonOriginale"
> {
  const fornitoriAlternativi = resolveFornitoriAlternativiFromMeta({
    fornitoriAlternativi: meta.fornitoriAlternativi,
    fornitoreNonOriginale: meta.fornitoreNonOriginale,
    codiceFornitoreNonOriginale: meta.codiceFornitoreNonOriginale,
    prezzoFornitoreNonOriginale: meta.prezzoFornitoreNonOriginale,
    scontoFornitoreNonOriginale: meta.scontoFornitoreNonOriginale,
  });

  const partial: Pick<
    RicambioMagazzino,
    | "note"
    | "categoria"
    | "compatibilitaMezzi"
    | "compatibilitaRefs"
    | "codiceFornitoreOriginaleSecondario"
    | "marcaOriginaleSecondaria"
    | "usatoInTagliandi"
    | "unitaMisura"
    | "scortaMinima"
    | "scontoFornitoreOriginale"
    | "fornitoriAlternativi"
    | "fornitoreNonOriginale"
    | "codiceFornitoreNonOriginale"
    | "prezzoFornitoreNonOriginale"
    | "scontoFornitoreNonOriginale"
  > = {
    note: meta.note ?? "",
    categoria: meta.categoria?.trim() || "Generale",
    compatibilitaMezzi: meta.compatibilitaMezzi?.filter((x) => x && x !== "—") ?? [],
    compatibilitaRefs: meta.compatibilitaRefs,
    codiceFornitoreOriginaleSecondario: meta.codiceOriginaleSecondario ?? "",
    marcaOriginaleSecondaria: meta.marcaOriginaleSecondaria ?? "",
    usatoInTagliandi: meta.usatoInTagliandi === true,
    unitaMisura: parseRicambioUnitaMisura(meta.unitaMisura),
    scortaMinima: Math.max(0, meta.scortaMinima ?? 0),
    scontoFornitoreOriginale: Math.min(100, Math.max(0, meta.scontoFornitoreOriginale ?? 0)),
    fornitoriAlternativi,
    fornitoreNonOriginale: meta.fornitoreNonOriginale ?? "",
    codiceFornitoreNonOriginale: meta.codiceFornitoreNonOriginale ?? "",
    prezzoFornitoreNonOriginale: Math.max(0, meta.prezzoFornitoreNonOriginale ?? 0),
    scontoFornitoreNonOriginale: Math.min(100, Math.max(0, meta.scontoFornitoreNonOriginale ?? 0)),
  };

  syncFlatFornitoreFieldsOnRicambio(partial);
  return partial;
}

/** Migrazione esplicita legacy → array (test / repair). */
export function migrateLegacyFornitoriInMeta(meta: MagazzinoRicambioMeta): MagazzinoRicambioMeta {
  const rows = resolveFornitoriAlternativiFromMeta(meta);
  if (!rows.length) return meta;
  const legacy = legacyFornitoreAlternativoFromMeta(meta);
  return {
    ...meta,
    fornitoriAlternativi: rows,
    ...(legacy ? syncLegacyFornitoreFieldsFromAlternativi(rows) : {}),
  };
}
