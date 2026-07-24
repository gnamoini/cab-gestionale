import type { CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import {
  buildDocumentiViewTree,
  compareDocs,
  documentoCollocatoInCatalogo,
  getDocAssocRefs,
  assocPairLabel,
  labelCategoria,
  labelTipoFile,
  formatDocumentoRigaSintetica,
  labelApplicabilitaBreve,
  resolveDocumentoApplicazione,
  type ArchiveDocMarcaNode,
  type DocumentiSortKey,
  type DocumentiSortPhase,
} from "@/components/gestionale/documenti/documenti-helpers";
import {
  documentoCertificazioneSenzaMarca,
  documentoSenzaMarca,
  documentoSenzaMarcaConAvviso,
} from "@/lib/documenti/documenti-senza-marca-classify";
import {
  documentoRowMatchesAdvancedFilters,
  type DocumentiAdvancedFilters,
} from "@/lib/documenti/documenti-advanced-filters";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildSearchDocumentFromParts } from "@/lib/search/build-document";
import { matchSearchString } from "@/lib/search/match";

export type DocumentiPageFilters = DocumentiAdvancedFilters & {
  search: string;
};

export type DocumentiSortState = {
  sortColumn: DocumentiSortKey | null;
  sortPhase: DocumentiSortPhase;
};

export type DocumentiFilteredView = {
  senzaMarca: DocumentoGestionale[];
  certificazioniSenzaMarca: DocumentoGestionale[];
  conMarca: DocumentoGestionale[];
  tree: ArchiveDocMarcaNode[];
  senzaCollocazione: DocumentoGestionale[];
  totalDocs: number;
};

export function buildDocumentiSearchHaystackById(
  docs: readonly DocumentoGestionale[],
  catalog: CatalogMarca[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const doc of docs) {
    const r = resolveDocumentoApplicazione(doc);
    const assocText = getDocAssocRefs(doc, catalog)
      .map((ref) => assocPairLabel(catalog, ref))
      .join(" ");
    const hay = buildSearchDocumentFromParts([
      doc.nome,
      r.marcaKey ?? r.marca,
      r.modelloKey ?? r.macchina,
      documentoSenzaMarca(doc) ? "senza marca" : "",
      labelCategoria(doc.categoria),
      labelTipoFile(doc.tipoFile),
      labelApplicabilitaBreve(r.applicabilita!),
      formatDocumentoRigaSintetica(doc),
      doc.note ?? "",
      assocText,
    ]);
    map.set(doc.id, hay);
  }
  return map;
}

function docRowMatchesGlobalSearchHaystack(haystack: string, query: string): boolean {
  return matchSearchString(query, haystack).matches;
}

export function docRowMatchesGlobalSearch(
  doc: DocumentoGestionale,
  catalog: CatalogMarca[],
  query: string,
): boolean {
  const r = resolveDocumentoApplicazione(doc);
  const assocText = getDocAssocRefs(doc, catalog)
    .map((ref) => assocPairLabel(catalog, ref))
    .join(" ");
  const hay = buildSearchDocumentFromParts([
    doc.nome,
    r.marcaKey ?? r.marca,
    r.modelloKey ?? r.macchina,
    documentoSenzaMarca(doc) ? "senza marca" : "",
    labelCategoria(doc.categoria),
    labelTipoFile(doc.tipoFile),
    labelApplicabilitaBreve(r.applicabilita!),
    formatDocumentoRigaSintetica(doc),
    doc.note ?? "",
    assocText,
  ]);
  return matchSearchString(query, hay).matches;
}

export function docRowMatchesPageFilters(
  doc: DocumentoGestionale,
  catalog: CatalogMarca[],
  filters: DocumentiPageFilters,
  searchHaystackById?: Map<string, string>,
): boolean {
  const searchOk = searchHaystackById
    ? docRowMatchesGlobalSearchHaystack(searchHaystackById.get(doc.id) ?? "", filters.search)
    : docRowMatchesGlobalSearch(doc, catalog, filters.search);
  if (!searchOk) return false;
  const { search: _s, ...advanced } = filters;
  return documentoRowMatchesAdvancedFilters(doc, advanced);
}

export function buildDocumentiFilteredView(
  docs: readonly DocumentoGestionale[],
  catalog: CatalogMarca[],
  mezziSnap: MezzoGestito[],
  filters: DocumentiPageFilters,
  sort: DocumentiSortState,
  searchHaystackById?: Map<string, string>,
): DocumentiFilteredView {
  const { sortColumn, sortPhase } = sort;
  const senzaMarca: DocumentoGestionale[] = [];
  const certificazioniSenzaMarca: DocumentoGestionale[] = [];
  const conMarca: DocumentoGestionale[] = [];

  for (const d of docs) {
    if (!docRowMatchesPageFilters(d, catalog, filters, searchHaystackById)) continue;
    if (documentoCertificazioneSenzaMarca(d)) certificazioniSenzaMarca.push(d);
    else if (documentoSenzaMarcaConAvviso(d)) senzaMarca.push(d);
    else conMarca.push(d);
  }

  senzaMarca.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase, { skipSenzaMarcaPartition: true }));
  certificazioniSenzaMarca.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase, { skipSenzaMarcaPartition: true }));
  conMarca.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase, { skipSenzaMarcaPartition: true }));

  const tree = buildDocumentiViewTree(catalog, mezziSnap, conMarca, sortColumn, sortPhase);
  const senzaCollocazione = conMarca.filter((d) => !documentoCollocatoInCatalogo(d, catalog, mezziSnap));

  return {
    senzaMarca,
    certificazioniSenzaMarca,
    conMarca,
    tree,
    senzaCollocazione,
    totalDocs: senzaMarca.length + certificazioniSenzaMarca.length + conMarca.length,
  };
}

/** Etichetta pager albero: paginazione per nodi marca. */
export function documentiMarcaPagerLabel(page: number, pageSize: number, totalMarche: number): string {
  if (totalMarche <= 0) return "Nessun risultato";
  const size = Math.max(1, pageSize);
  if (totalMarche <= size) {
    return `${totalMarche} marc${totalMarche === 1 ? "a" : "he"} nell'archivio`;
  }
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, totalMarche);
  return `Marche ${from}–${to} di ${totalMarche.toLocaleString("it-IT")}`;
}

export function sliceDocumentiTreePage(
  tree: readonly ArchiveDocMarcaNode[],
  page: number,
  pageSize: number,
): ArchiveDocMarcaNode[] {
  const size = Math.max(1, pageSize);
  if (tree.length <= size) return [...tree];
  const start = (page - 1) * size;
  return tree.slice(start, start + size);
}

export function documentiMarcaPageCount(totalMarche: number, pageSize: number): number {
  const size = Math.max(1, pageSize);
  return Math.max(1, Math.ceil(Math.max(0, totalMarche) / size));
}
