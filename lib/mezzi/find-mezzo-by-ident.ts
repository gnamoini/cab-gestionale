import {
  ingressoMatchToMezzoCandidates,
  resolveIngressoMezzoMatchFromCatalog,
  type IngressoMezzoMatchResult,
} from "@/lib/schede/scheda-ingresso-mezzo-match";
import {
  mezzoGestitoToCandidate,
  type MezzoIngressoIdent,
  type MezzoResolutionResult,
} from "@/lib/domain/mezzo/mezzo-resolution";
import { normalizeTarga, normalizeVinIdentity } from "@/lib/domain/mezzo/mezzo-identity";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

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

function identToSchedaFields(ident: MezzoIngressoIdent): SchedaIngressoFields {
  return {
    dataIngresso: "",
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    matricola: ident.matricola ?? "",
    nScuderia: ident.nScuderia ?? "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: ident.vin ?? "",
    targa: ident.targa ?? "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    richiedenteTelefono: "",
  };
}

function ingressoResultToResolution(
  result: IngressoMezzoMatchResult,
  identUsed: MezzoIngressoIdent,
): MezzoResolutionResult {
  if (result.status === "not_found") {
    return { status: "not_found", identUsed };
  }
  if (result.status === "ambiguous") {
    return {
      status: "ambiguous",
      candidates: ingressoMatchToMezzoCandidates(result.candidates),
      identUsed,
    };
  }
  return {
    status: "needs_confirm",
    candidates: ingressoMatchToMezzoCandidates(result.candidates),
    identUsed,
    topCandidateId: result.candidate.mezzo.id,
    matchReason: result.reason,
  };
}

/** Risoluzione ident su catalogo — nessun auto-link senza preferredMezzoId. */
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

  const scheda = identToSchedaFields(identUsed);
  const match = resolveIngressoMezzoMatchFromCatalog(scheda, mezzi);
  return ingressoResultToResolution(match, identUsed);
}

/** Risoluzione da scheda ingresso completa (include cliente per scoring). */
export function resolveMezzoBySchedaFromCatalog(
  scheda: SchedaIngressoFields,
  mezzi: readonly MezzoGestito[],
): MezzoResolutionResult {
  const identUsed: MezzoIngressoIdent = {
    targa: scheda.targa?.trim() || undefined,
    matricola: scheda.matricola?.trim() || undefined,
    nScuderia: scheda.nScuderia?.trim() || undefined,
    vin: scheda.vin?.trim() || undefined,
  };
  const match = resolveIngressoMezzoMatchFromCatalog(scheda, mezzi);
  return ingressoResultToResolution(match, identUsed);
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
  if (result.status === "resolved") {
    return mezzi.find((m) => m.id === result.mezzoId) ?? null;
  }
  return null;
}

function buildCandidatesFromMatches(
  matches: readonly MezzoGestito[],
  signals: string[],
): import("@/lib/domain/mezzo/mezzo-resolution").MezzoCandidate[] {
  return matches.map((m) => mezzoGestitoToCandidate(m, signals));
}

/** @deprecated legacy helper — usa findMezziBy* + scorer. */
export function buildCandidatesFromMezzi(
  matches: readonly MezzoGestito[],
  signals: string[],
): import("@/lib/domain/mezzo/mezzo-resolution").MezzoCandidate[] {
  return buildCandidatesFromMatches(matches, signals);
}
