import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  mapCaptureFieldsToIngresso,
  mapCaptureHeaderToIngressoSlice,
} from "@/lib/document-capture/capture-field-mapper";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { hasSchedaIngressoIdentLookup } from "@/lib/schede/scheda-ingresso-reuse";
import {
  schedaIngressoCampiMatchIdent,
  type SchedaIngressoLookupIdent,
} from "@/lib/schede/scheda-ingresso-ident-match";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export type CaptureIdent = {
  targa: string;
  matricola: string;
  nScuderia: string;
  vin: string;
  cliente: string;
};

function safeStr(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function normVin(v: string | null | undefined): string {
  return safeStr(v).toUpperCase().replace(/\s/g, "");
}

export function hasCaptureIdentLookup(ident: CaptureIdent): boolean {
  return (
    hasSchedaIngressoIdentLookup(ident.targa, ident.matricola, ident.nScuderia) || Boolean(normVin(ident.vin))
  );
}

/** Match stretto su scheda ingresso: solo targa / matricola / scuderia / VIN (no fuzzy marca-modello). */
export function ingressoIdentMatchesCapture(
  campi: SchedaIngressoFields,
  ident: CaptureIdent,
): boolean {
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

export function describeCaptureLavorazioneAssignTarget(
  lavorazioneId: string,
  attive: readonly LavorazioneAttiva[],
  schedeStore: LavorazioneSchedeStore,
): string {
  const lav = attive.find((row) => row.id === lavorazioneId);
  const campi = schedeStore[lavorazioneId]?.ingresso?.campi;
  const parts: string[] = [];
  if (lav?.codice?.trim()) parts.push(`lavorazione ${lav.codice.trim()}`);
  const cliente = safeStr(campi?.cliente) || safeStr(lav?.cliente);
  if (cliente) parts.push(cliente);
  const macchina = safeStr(lav?.macchina);
  if (macchina) parts.push(macchina);
  const identBits = [campi?.targa, campi?.matricola, campi?.nScuderia, campi?.vin]
    .map((v) => safeStr(v))
    .filter((v) => v && v !== "—");
  if (identBits.length) parts.push(identBits.join(" · "));
  return parts.length > 0 ? parts.join(" — ") : "lavorazione in corso";
}

/** Lavorazione in corso con scheda ingresso corrispondente (targa/matricola/scuderia/VIN). */
export function findActiveLavorazioneWithIngressoForCaptureIdent(
  ident: CaptureIdent,
  _mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  attive: readonly LavorazioneAttiva[],
): { lavorazioneId: string; cliente: string } | null {
  if (!hasCaptureIdentLookup(ident)) return null;

  let best: { lavorazioneId: string; cliente: string; updatedAt: string } | null = null;

  for (const lav of attive) {
    const ing = schedeStore[lav.id]?.ingresso;
    if (!ing || ing.sorgente === "file_esterno") continue;
    if (!ingressoIdentMatchesCapture(ing.campi, ident)) continue;

    const updatedAt = ing.updatedAt;
    if (!best || new Date(updatedAt).getTime() > new Date(best.updatedAt).getTime()) {
      best = {
        lavorazioneId: lav.id,
        cliente: safeStr(ing.campi.cliente) || ident.cliente,
        updatedAt,
      };
    }
  }

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
