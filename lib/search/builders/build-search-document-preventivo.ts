import { preventivoStatoLabel } from "@/lib/preventivi/preventivi-advanced-filters";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { buildSearchDocumentFromParts } from "@/lib/search/build-document";

export function buildSearchDocumentPreventivo(row: PreventivoRecord): string {
  return buildSearchDocumentFromParts([
    row.numero,
    row.cliente,
    row.cantiere,
    row.utilizzatore,
    row.macchinaRiassunto,
    row.targa,
    row.matricola,
    row.nScuderia,
    row.marcaAttrezzatura,
    row.modelloAttrezzatura,
    row.lavorazioneId,
    row.statoWorkflow,
    preventivoStatoLabel(row.statoWorkflow),
    row.statoCliente ? preventivoStatoLabel(row.statoCliente) : "",
    row.tipoDocumento,
    preventivoTipoDocumentoLabel(row.tipoDocumento),
    preventivoTipoDocumentoLabel(row.tipoDocumento, "short"),
    row.descrizioneLavorazioniCliente,
  ]);
}
