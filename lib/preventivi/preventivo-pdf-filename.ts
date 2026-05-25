import { fmtDateIt } from "@/lib/pdf/preventivo-pdf-layout";
import { sanitizePdfFileNamePart } from "@/lib/pdf/pdf-filename-utils";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Etichetta progressivo per nome file PDF. */
export function formatPreventivoNumeroFileLabel(numero: string): string {
  const t = numero.trim();
  if (!t) return "N.senza-numero";

  const linked = /^(\d{2}-\d{4})\/(\d+)$/.exec(t);
  if (linked) {
    const seq = parseInt(linked[2]!, 10);
    return Number.isFinite(seq) ? `N.${seq}` : `N.${linked[2]}`;
  }

  const manual = /^(\d{2})-(\d{4})\/M$/i.exec(t);
  if (manual) {
    const seq = parseInt(manual[2]!, 10);
    return Number.isFinite(seq) ? `N.${seq}-M` : "N.M";
  }

  const legacy = /^(?:PV-)?(\d{4})-(\d+)$/.exec(t);
  if (legacy) {
    const seq = parseInt(legacy[2]!, 10);
    return Number.isFinite(seq) ? `N.${seq}` : `N.${legacy[2]}`;
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
