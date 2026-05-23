import { fmtDateIt } from "@/lib/pdf/preventivo-pdf-layout";
import { sanitizePdfFileNamePart } from "@/lib/pdf/pdf-filename-utils";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Etichetta progressivo per nome file: es. N.12 da 2026-012 o PV-2026-012. */
export function formatPreventivoNumeroFileLabel(numero: string): string {
  const t = numero.trim();
  if (!t) return "N.senza-numero";
  const m = /^(?:PV-)?(\d{4})-(\d+)$/.exec(t);
  if (m) {
    const seq = parseInt(m[2]!, 10);
    return Number.isFinite(seq) ? `N.${seq}` : `N.${m[2]}`;
  }
  return `N.${sanitizePdfFileNamePart(t, "senza-numero")}`;
}

/**
 * Nome file export PDF:
 * Preventivo_N.12_20/05/2026_AMIU_Puglia.pdf
 */
export function buildPreventivoPdfDownloadFileName(p: PreventivoRecord): string {
  const tipo = preventivoTipoDocumentoLabel(p.tipoDocumento);
  const numero = formatPreventivoNumeroFileLabel(p.numero);
  const data = p.dataCreazione ? fmtDateIt(p.dataCreazione) : fmtDateIt(new Date().toISOString());
  const cliente = sanitizePdfFileNamePart(p.cliente, "Cliente");
  const base = `${tipo} ${numero} ${data} ${cliente}`.replace(/\s+/g, " ").trim();
  return `${base.replace(/\s+/g, "_")}.pdf`;
}
