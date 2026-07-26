import {
  mezzoGestitoToCandidate,
  type MezzoIngressoIdent,
  type MezzoResolutionResult,
} from "@/lib/domain/mezzo/mezzo-resolution";
import { normalizeTarga, normalizeVinIdentity } from "@/lib/domain/mezzo/mezzo-identity";
import type { MezzoGestito } from "@/lib/mezzi/types";

function normIdent(v: string): string {
  return v.trim().toLowerCase();
}

function normScuderia(v: string): string {
  const n = normIdent(v);
  if (!n || n === "—") return "";
  return n;
}

function matricolaComparable(v: string | null | undefined): string {
  const m = (v ?? "").trim();
  if (!m || m === "—" || m === "Non assegnata") return "";
  return normIdent(m);
}

/** Tutti i mezzi con targa normalizzata (SSOT normalizeVehicleIdentifier). */
export function findMezziByTarga(mezzi: readonly MezzoGestito[], targa: string): MezzoGestito[] {
  const t = normalizeTarga(targa);
  if (!t) return [];
  return mezzi.filter((x) => {
    const xt = normalizeTarga(x.targa);
    return xt && xt === t;
  });
}

/** Tutti i mezzi con VIN normalizzato. */
export function findMezziByVin(mezzi: readonly MezzoGestito[], vin: string): MezzoGestito[] {
  const v = normalizeVinIdentity(vin);
  if (!v) return [];
  return mezzi.filter((x) => {
    const xv = normalizeVinIdentity(x.vin);
    return xv && xv === v;
  });
}

/** Tutti i mezzi con matricola esatta (case-insensitive). */
export function findMezziByMatricola(mezzi: readonly MezzoGestito[], matricola: string): MezzoGestito[] {
  const m = matricolaComparable(matricola);
  if (!m) return [];
  return mezzi.filter((x) => matricolaComparable(x.matricola) === m);
}

/** Tutti i mezzi con n. scuderia esatto (case-insensitive). */
export function findMezziByScuderia(mezzi: readonly MezzoGestito[], nScuderia: string): MezzoGestito[] {
  const ns = normScuderia(nScuderia);
  if (!ns) return [];
  return mezzi.filter((x) => {
    const xs = normScuderia(x.numeroScuderia ?? "");
    return xs && xs === ns;
  });
}

/** Trova mezzi per targa o matricola (match esatto, case-insensitive). */
export function findMezziByTargaOrMatricola(
  mezzi: readonly MezzoGestito[],
  targa: string,
  matricola: string,
): MezzoGestito[] {
  const byTarga = findMezziByTarga(mezzi, targa);
  if (byTarga.length > 0) return byTarga;
  return findMezziByMatricola(mezzi, matricola);
}

/** Tutti i match esatti su targa, matricola o n. scuderia (anagrafica ingresso). */
export function findMezziByIngressoIdent(
  mezzi: readonly MezzoGestito[],
  ident: MezzoIngressoIdent,
): MezzoGestito[] {
  const byTm = findMezziByTargaOrMatricola(mezzi, ident.targa ?? "", ident.matricola ?? "");
  if (byTm.length > 0) return byTm;
  return findMezziByScuderia(mezzi, ident.nScuderia ?? "");
}

function buildCandidatesFromMatches(
  matches: readonly MezzoGestito[],
  signals: string[],
): import("@/lib/domain/mezzo/mezzo-resolution").MezzoCandidate[] {
  return matches.map((m) => mezzoGestitoToCandidate(m, signals));
}

/** Risoluzione ident su catalogo → contract unificato. */
export function resolveMezzoByIdentFromCatalog(
  mezzi: readonly MezzoGestito[],
  ident: MezzoIngressoIdent,
): MezzoResolutionResult {
  const identUsed: MezzoIngressoIdent = {
    targa: ident.targa?.trim() || undefined,
    matricola: ident.matricola?.trim() || undefined,
    nScuderia: ident.nScuderia?.trim() || undefined,
    vin: ident.vin?.trim() || undefined,
  };

  const byVin = findMezziByVin(mezzi, ident.vin ?? "");
  if (byVin.length === 1) {
    return { status: "resolved", mezzoId: byVin[0]!.id, source: "ident" };
  }
  if (byVin.length > 1) {
    return {
      status: "ambiguous",
      candidates: buildCandidatesFromMatches(byVin, ["vin:exact"]),
      identUsed,
    };
  }

  const byTarga = findMezziByTarga(mezzi, ident.targa ?? "");
  if (byTarga.length === 1) {
    return { status: "resolved", mezzoId: byTarga[0]!.id, source: "ident" };
  }
  if (byTarga.length > 1) {
    return {
      status: "ambiguous",
      candidates: buildCandidatesFromMatches(byTarga, ["targa:exact"]),
      identUsed,
    };
  }

  const byMatricola = findMezziByMatricola(mezzi, ident.matricola ?? "");
  if (byMatricola.length === 1) {
    return { status: "resolved", mezzoId: byMatricola[0]!.id, source: "ident" };
  }
  if (byMatricola.length > 1) {
    return {
      status: "ambiguous",
      candidates: buildCandidatesFromMatches(byMatricola, ["matricola:exact"]),
      identUsed,
    };
  }

  const byScuderia = findMezziByScuderia(mezzi, ident.nScuderia ?? "");
  if (byScuderia.length === 1) {
    return { status: "resolved", mezzoId: byScuderia[0]!.id, source: "ident" };
  }
  if (byScuderia.length > 1) {
    return {
      status: "ambiguous",
      candidates: buildCandidatesFromMatches(byScuderia, ["scuderia:exact"]),
      identUsed,
    };
  }

  return { status: "not_found", identUsed };
}

/** @deprecated Usare resolveMezzoByIdentFromCatalog — ritorna match solo se unico. */
export function findMezzoByTargaOrMatricola(
  mezzi: readonly MezzoGestito[],
  targa: string,
  matricola: string,
): MezzoGestito | null {
  const hits = findMezziByTargaOrMatricola(mezzi, targa, matricola);
  return hits.length === 1 ? hits[0]! : null;
}

/** @deprecated Usare resolveMezzoByIdentFromCatalog — ritorna match solo se unico. */
export function findMezzoByIngressoIdent(
  mezzi: readonly MezzoGestito[],
  ident: MezzoIngressoIdent,
): MezzoGestito | null {
  const result = resolveMezzoByIdentFromCatalog(mezzi, ident);
  if (result.status !== "resolved") return null;
  return mezzi.find((m) => m.id === result.mezzoId) ?? null;
}
