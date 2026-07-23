import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  mapCaptureFieldsToIngresso,
  mapCaptureHeaderToIngressoSlice,
} from "@/lib/document-capture/capture-field-mapper";
import { describeLavorazioneAssignLabel } from "@/lib/document-capture/capture-manual-assign-state";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { hasSchedaIngressoIdentLookup } from "@/lib/schede/scheda-ingresso-reuse";
import {
  schedaIngressoCampiMatchIdent,
  type SchedaIngressoLookupIdent,
} from "@/lib/schede/scheda-ingresso-ident-match";
import { normalizeVehicleIdentifier } from "@/lib/schede/normalize-vehicle-identifier";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export type CaptureIdent = {
  targa: string;
  matricola: string;
  nScuderia: string;
  vin: string;
  cliente: string;
};

export type CaptureMatchSource = "ingresso" | "mezzo" | "lavorazione" | "cache";

export type CaptureMatchCandidate = {
  lavorazioneId: string;
  score: number;
  reason: string[];
  source: CaptureMatchSource;
  recency: string;
  cliente: string;
};

const FIELD_WEIGHTS = {
  targa: 100,
  matricola: 90,
  nScuderia: 80,
  vin: 70,
} as const;

const SOURCE_PRIORITY: Record<CaptureMatchSource, number> = {
  ingresso: 4,
  mezzo: 3,
  lavorazione: 2,
  cache: 1,
};

function safeStr(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export function hasCaptureIdentLookup(ident: CaptureIdent): boolean {
  return (
    hasSchedaIngressoIdentLookup(ident.targa, ident.matricola, ident.nScuderia) ||
    Boolean(normalizeVehicleIdentifier("vin", ident.vin))
  );
}

/** Match stretto su scheda ingresso: solo targa / matricola / scuderia / VIN (no fuzzy marca-modello). */
export function ingressoIdentMatchesCapture(campi: SchedaIngressoFields, ident: CaptureIdent): boolean {
  return schedaIngressoCampiMatchIdent(campi, ident satisfies SchedaIngressoLookupIdent);
}

export function resolveCaptureIdentFromFields(fields: readonly CaptureFieldRow[]): CaptureIdent {
  const ingresso = mapCaptureFieldsToIngresso(fields);
  const header = mapCaptureHeaderToIngressoSlice(fields);
  return {
    targa: safeStr(ingresso.targa) || safeStr(header.targa),
    matricola: safeStr(ingresso.matricola) || safeStr(header.matricola),
    nScuderia: safeStr(ingresso.nScuderia),
    vin: safeStr(ingresso.vin),
    cliente: safeStr(ingresso.cliente) || safeStr(header.cliente),
  };
}

function normField(kind: keyof typeof FIELD_WEIGHTS, value: string): string {
  if (kind === "nScuderia") return normalizeVehicleIdentifier("scuderia", value);
  return normalizeVehicleIdentifier(kind, value);
}

/** Score ident capture vs target; null se conflitto o nessun campo matched. */
export function scoreCaptureIdentAgainstTarget(
  ident: CaptureIdent,
  target: SchedaIngressoLookupIdent,
): { score: number; reason: string[] } | null {
  const fields: Array<{ kind: keyof typeof FIELD_WEIGHTS; cap: string; tgt: string }> = [
    { kind: "targa", cap: ident.targa, tgt: target.targa },
    { kind: "matricola", cap: ident.matricola, tgt: target.matricola },
    { kind: "nScuderia", cap: ident.nScuderia, tgt: target.nScuderia },
    { kind: "vin", cap: ident.vin, tgt: target.vin ?? "" },
  ];

  let score = 0;
  const reason: string[] = [];
  let hasProvided = false;
  let hasMatched = false;

  for (const { kind, cap, tgt } of fields) {
    const normCap = normField(kind, cap);
    const normTgt = normField(kind, tgt);
    if (!normCap) continue;
    hasProvided = true;
    if (!normTgt) continue;
    if (normCap !== normTgt) return null;
    score += FIELD_WEIGHTS[kind];
    reason.push(`${kind}:${FIELD_WEIGHTS[kind]}`);
    hasMatched = true;
  }

  if (!hasProvided || !hasMatched) return null;
  return { score, reason };
}

function targetFromIngressoCampi(campi: SchedaIngressoFields): SchedaIngressoLookupIdent {
  return {
    targa: campi.targa,
    matricola: campi.matricola,
    nScuderia: campi.nScuderia,
    vin: campi.vin,
  };
}

function targetFromLavorazione(lav: LavorazioneAttiva): SchedaIngressoLookupIdent {
  return {
    targa: lav.targa,
    matricola: lav.matricola,
    nScuderia: lav.nScuderia,
    vin: "",
  };
}

function findMezzoForLavorazione(lav: LavorazioneAttiva, mezzi: readonly MezzoGestito[]): MezzoGestito | null {
  const byLink = mezzi.find((m) => m.lavorazioneMezzoId === lav.id);
  if (byLink) return byLink;

  const lavTarga = normField("targa", lav.targa);
  const lavMat = normField("matricola", lav.matricola);
  if (!lavTarga && !lavMat) return null;

  return (
    mezzi.find((m) => {
      const mTarga = normField("targa", m.targa);
      const mMat = normField("matricola", m.matricola);
      if (lavTarga && mTarga && lavTarga === mTarga) return true;
      if (lavMat && mMat && lavMat === mMat) return true;
      return false;
    }) ?? null
  );
}

function targetFromMezzo(mezzo: MezzoGestito): SchedaIngressoLookupIdent {
  return {
    targa: mezzo.targa,
    matricola: mezzo.matricola,
    nScuderia: mezzo.numeroScuderia ?? "",
    vin: mezzo.vin ?? "",
  };
}

function recencyFromIngresso(updatedAt: string | undefined, lav: LavorazioneAttiva): string {
  return updatedAt?.trim() || lav.dataIngresso || "";
}

/** Raccoglie candidati scored per tutte le lavorazioni attive. */
export function scoreCaptureLavorazioneCandidates(
  ident: CaptureIdent,
  mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  attive: readonly LavorazioneAttiva[],
): CaptureMatchCandidate[] {
  if (!hasCaptureIdentLookup(ident)) return [];

  const perLavBest = new Map<string, CaptureMatchCandidate>();

  for (const lav of attive) {
    const bundle = schedeStore[lav.id];
    const ingresso = bundle?.ingresso;
    const sources: Array<{ source: CaptureMatchSource; target: SchedaIngressoLookupIdent; recency: string; cliente: string }> = [];

    if (ingresso && ingresso.sorgente !== "file_esterno") {
      sources.push({
        source: "ingresso",
        target: targetFromIngressoCampi(ingresso.campi),
        recency: recencyFromIngresso(ingresso.updatedAt, lav),
        cliente: safeStr(ingresso.campi.cliente) || ident.cliente,
      });
    }

    const mezzo = findMezzoForLavorazione(lav, mezzi);
    if (mezzo) {
      sources.push({
        source: "mezzo",
        target: targetFromMezzo(mezzo),
        recency: mezzo.ultimaModifica?.trim() || lav.dataIngresso || "",
        cliente: safeStr(mezzo.cliente) || ident.cliente,
      });
    }

    sources.push({
      source: "lavorazione",
      target: targetFromLavorazione(lav),
      recency: lav.dataIngresso || "",
      cliente: safeStr(lav.cliente) || ident.cliente,
    });

    if (ingresso && ingresso.sorgente === "file_esterno") {
      sources.push({
        source: "cache",
        target: targetFromIngressoCampi(ingresso.campi),
        recency: recencyFromIngresso(ingresso.updatedAt, lav),
        cliente: safeStr(ingresso.campi.cliente) || ident.cliente,
      });
    } else if (ingresso && ingresso.sorgente !== "file_esterno") {
      // ponytail: cache = bundle parziale senza ingresso valido già provato
    } else if (bundle && !ingresso) {
      // nessun ingresso in cache — lavorazione source già inclusa
    }

    let lavBest: CaptureMatchCandidate | null = null;

    for (const { source, target, recency, cliente } of sources) {
      const scored = scoreCaptureIdentAgainstTarget(ident, target);
      if (!scored) continue;

      const candidate: CaptureMatchCandidate = {
        lavorazioneId: lav.id,
        score: scored.score,
        reason: scored.reason,
        source,
        recency,
        cliente,
      };

      if (
        !lavBest ||
        candidate.score > lavBest.score ||
        (candidate.score === lavBest.score && SOURCE_PRIORITY[candidate.source] > SOURCE_PRIORITY[lavBest.source])
      ) {
        lavBest = candidate;
      }
    }

    if (lavBest) perLavBest.set(lav.id, lavBest);
  }

  return [...perLavBest.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const recA = new Date(a.recency).getTime();
    const recB = new Date(b.recency).getTime();
    if (recB !== recA) return recB - recA;
    return SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
  });
}

export function describeCaptureLavorazioneAssignTarget(
  lavorazioneId: string,
  attive: readonly LavorazioneAttiva[],
  schedeStore: LavorazioneSchedeStore,
): string {
  return describeLavorazioneAssignLabel(lavorazioneId, attive, schedeStore);
}

/** Lavorazione in corso con identificativi corrispondenti (scoring multi-sorgente). */
export function findActiveLavorazioneWithIngressoForCaptureIdent(
  ident: CaptureIdent,
  mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  attive: readonly LavorazioneAttiva[],
): { lavorazioneId: string; cliente: string } | null {
  const ranked = scoreCaptureLavorazioneCandidates(ident, mezzi, schedeStore, attive);
  const best = ranked[0];
  if (!best) return null;
  return { lavorazioneId: best.lavorazioneId, cliente: best.cliente };
}

export function formatCaptureIdentSummary(ident: CaptureIdent): string {
  const parts = [
    ident.targa ? `targa ${ident.targa}` : "",
    ident.matricola ? `matricola ${ident.matricola}` : "",
    ident.nScuderia ? `scuderia ${ident.nScuderia}` : "",
    ident.vin ? `VIN ${ident.vin}` : "",
    ident.cliente ? `cliente ${ident.cliente}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "identificativi sulla scheda";
}
