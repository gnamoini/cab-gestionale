import type { CatalogMacchina, CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import {
  documentoFileAccessBlockLabel,
  documentoFileOpenFailureMessage,
  getDocumentoFileAccessState,
  type DocumentoFileAccessState,
  type DocumentoFileOpenResult,
} from "@/lib/documenti/documento-file-access";
import { archiveDocumentDeliveryUrl } from "@/lib/documents/document-delivery-url";
import type { DocumentoRow } from "@/src/types/supabase-tables";
import {
  formatDocumentoRigaSintetica,
  labelApplicabilitaBreve,
  legacyAssocRefs,
  resolveDocumentoApplicazione,
} from "@/lib/documenti/documenti-applicabilita";
import {
  inferTipoFileFromNome,
  resolveDocumentoTipoFile,
} from "@/lib/documenti/documento-tipo-file";
import type { DocumentoAssocRef, DocumentoGestionale, DocumentoTipoFile } from "@/lib/types/gestionale";

export { inferTipoFileFromNome, resolveDocumentoTipoFile };
import type { MezzoGestito } from "@/lib/mezzi/types";

export function labelCategoria(c: DocumentoGestionale["categoria"]): string {
  switch (c) {
    case "listini":
      return "Listini";
    case "cataloghi":
      return "Cataloghi";
    case "manuali":
      return "Manuali";
    case "certificazioni":
      return "Certificazioni";
    default:
      return "Altro";
  }
}

export function labelTipoFile(t: DocumentoTipoFile): string {
  switch (t) {
    case "pdf":
      return "PDF";
    case "immagine":
      return "Immagine";
    case "excel":
      return "Excel";
    case "word":
      return "Word";
    case "testo":
      return "Testo";
    default:
      return "Altro";
  }
}

export function getDocAssocRefs(doc: DocumentoGestionale, catalog: CatalogMarca[]): DocumentoAssocRef[] {
  return legacyAssocRefs(doc, catalog);
}

export function assocPairLabel(catalog: CatalogMarca[], ref: DocumentoAssocRef): string {
  const mar = catalog.find((m) => m.id === ref.marcaId);
  const mac = mar?.macchine.find((x) => x.id === ref.macchinaId);
  if (!mar || !mac) return "—";
  return `${mar.nome} ${mac.nome}`;
}

export type DocumentiSortKey = "nome" | "marca" | "macchina" | "caricatoIl" | "categoria";
export type DocumentiSortPhase = "natural" | "asc" | "desc";

import {
  documentoCertificazioneSenzaMarca,
  documentoHaMarcaAssegnata,
  documentoSenzaMarca,
  documentoSenzaMarcaConAvviso,
} from "@/lib/documenti/documenti-senza-marca-classify";

export {
  documentoCertificazioneSenzaMarca,
  documentoHaMarcaAssegnata,
  documentoSenzaMarca,
  documentoSenzaMarcaConAvviso,
};

function compareSenzaMarcaPrima(a: DocumentoGestionale, b: DocumentoGestionale): number {
  const sa = documentoSenzaMarca(a) ? 0 : 1;
  const sb = documentoSenzaMarca(b) ? 0 : 1;
  return sa - sb;
}

export function compareDocs(
  a: DocumentoGestionale,
  b: DocumentoGestionale,
  key: DocumentiSortKey | null,
  phase: DocumentiSortPhase,
  opts?: { skipSenzaMarcaPartition?: boolean },
): number {
  const ra = resolveDocumentoApplicazione(a);
  const rb = resolveDocumentoApplicazione(b);
  if (!opts?.skipSenzaMarcaPartition) {
    const senzaMarcaCmp = compareSenzaMarcaPrima(a, b);
    if (senzaMarcaCmp !== 0) return senzaMarcaCmp;
  }
  if (phase === "natural" || key === null) {
    const m = (ra.marcaKey ?? ra.marca).localeCompare(rb.marcaKey ?? rb.marca, "it");
    if (m !== 0) return m;
    const mac = (ra.modelloKey ?? ra.macchina).localeCompare(rb.modelloKey ?? rb.macchina, "it");
    if (mac !== 0) return mac;
    return a.nome.localeCompare(b.nome, "it");
  }
  const dir = phase === "asc" ? 1 : -1;
  switch (key) {
    case "nome":
      return a.nome.localeCompare(b.nome, "it") * dir;
    case "marca":
      return (ra.marcaKey ?? ra.marca).localeCompare(rb.marcaKey ?? rb.marca, "it") * dir;
    case "macchina":
      return (ra.modelloKey ?? ra.macchina).localeCompare(rb.modelloKey ?? rb.macchina, "it") * dir;
    case "caricatoIl":
      return (a.caricatoIl.localeCompare(b.caricatoIl, "it") || a.nome.localeCompare(b.nome, "it")) * dir;
    case "categoria":
      return (a.categoria.localeCompare(b.categoria, "it") || a.nome.localeCompare(b.nome, "it")) * dir;
    default:
      return 0;
  }
}

export type ArchiveDocModelloNode = { modello: CatalogMacchina; files: DocumentoGestionale[] };
export type ArchiveDocMarcaNode = { marca: CatalogMarca; filesMarca: DocumentoGestionale[]; modelli: ArchiveDocModelloNode[] };

/** Conteggio documenti per id marca (da elenco filtrato, non paginato). */
export function buildDocumentiCountByMarcaId(
  docs: DocumentoGestionale[],
  catalog: CatalogMarca[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of catalog) counts.set(m.id, 0);
  for (const d of docs) {
    if (documentoSenzaMarca(d)) continue;
    const r = resolveDocumentoApplicazione(d);
    const mar = catalog.find((m) => sameMarca(m.nome, r.marcaKey ?? r.marca));
    if (mar) counts.set(mar.id, (counts.get(mar.id) ?? 0) + 1);
  }
  return counts;
}

/** Solo presentazione UI: listini di marca vs altri documenti con applicabilità «marca». */
export function partitionMarcaLevelDocs(filesMarca: DocumentoGestionale[]): {
  listini: DocumentoGestionale[];
  altriMarca: DocumentoGestionale[];
} {
  const listini = filesMarca.filter((d) => d.categoria === "listini");
  const altriMarca = filesMarca.filter((d) => d.categoria !== "listini");
  return { listini, altriMarca };
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameMarca(a: string, b: string): boolean {
  return normalizeKey(a) === normalizeKey(b);
}

function removeMarcaPrefix(modelName: string, marcaName: string): string {
  const model = modelName.trim();
  const marca = marcaName.trim();
  if (!model || !marca) return model;
  const modelNorm = normalizeKey(model);
  const marcaNorm = normalizeKey(marca);
  if (!modelNorm.startsWith(marcaNorm)) return model;
  const re = new RegExp(`^${marca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-:]?\\s*`, "i");
  return model.replace(re, "").trim();
}

function sameModello(a: string, b: string, marcaName?: string): boolean {
  const left = normalizeKey(a);
  const right = normalizeKey(b);
  if (left === right) return true;
  if (!marcaName?.trim()) return false;
  const leftNoBrand = normalizeKey(removeMarcaPrefix(a, marcaName));
  const rightNoBrand = normalizeKey(removeMarcaPrefix(b, marcaName));
  return leftNoBrand.length > 0 && rightNoBrand.length > 0 && leftNoBrand === rightNoBrand;
}

/**
 * True se il documento ha un posto nell’albero (marca in catalogo da impostazioni/mezzi e, se serve, modello o mezzo coerente).
 * I documenti che restano fuori vanno mostrati nella sezione “senza collocazione”.
 */
export function documentoCollocatoInCatalogo(
  doc: DocumentoGestionale,
  catalog: CatalogMarca[],
  _mezzi: MezzoGestito[],
): boolean {
  if (documentoSenzaMarca(doc)) return false;
  const r = resolveDocumentoApplicazione(doc);
  const marcaNome = (r.marcaKey ?? r.marca).trim();
  const mar = catalog.find((m) => sameMarca(m.nome, marcaNome));
  if (!mar) return false;
  if (r.applicabilita === "marca") return true;
  const modNome = (r.modelloKey ?? r.macchina).trim();
  if (r.applicabilita === "modello") {
    if (!modNome || modNome === "—") return false;
    return mar.macchine.some((mac) => sameModello(mac.nome, modNome, mar.nome));
  }
  return false;
}

/** Albero: marca → (documenti intera marca) → modello → (documenti modello). */
export function buildDocumentiViewTree(
  catalog: CatalogMarca[],
  _mezzi: MezzoGestito[],
  sortedDocs: DocumentoGestionale[],
  sortColumn: DocumentiSortKey | null,
  sortPhase: DocumentiSortPhase,
): ArchiveDocMarcaNode[] {
  const marcaLevel = new Map<string, DocumentoGestionale[]>();
  const modelloByMarca = new Map<string, DocumentoGestionale[]>();

  for (const d of sortedDocs) {
    if (documentoSenzaMarca(d)) continue;
    const r = resolveDocumentoApplicazione(d);
    const marcaKey = normalizeKey(r.marcaKey ?? r.marca);
    if (!marcaKey) continue;
    if (r.applicabilita === "marca") {
      const list = marcaLevel.get(marcaKey) ?? [];
      list.push(d);
      marcaLevel.set(marcaKey, list);
    } else if (r.applicabilita === "modello") {
      const list = modelloByMarca.get(marcaKey) ?? [];
      list.push(d);
      modelloByMarca.set(marcaKey, list);
    }
  }

  const out: ArchiveDocMarcaNode[] = [];
  for (const marca of catalog) {
    const marcaKey = normalizeKey(marca.nome);
    const filesMarca = [...(marcaLevel.get(marcaKey) ?? [])];
    filesMarca.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase, { skipSenzaMarcaPartition: true }));

    const modelloCandidates = modelloByMarca.get(marcaKey) ?? [];
    const modelli: ArchiveDocModelloNode[] = [];

    for (const mac of marca.macchine) {
      const filesModello: DocumentoGestionale[] = [];
      for (const d of modelloCandidates) {
        const r = resolveDocumentoApplicazione(d);
        if (!sameModello(r.modelloKey ?? r.macchina, mac.nome, marca.nome)) continue;
        filesModello.push(d);
      }
      filesModello.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase, { skipSenzaMarcaPartition: true }));

      if (filesModello.length > 0) {
        modelli.push({
          modello: mac,
          files: filesModello,
        });
      }
    }

    if (filesMarca.length === 0 && modelli.length === 0) continue;
    out.push({ marca, filesMarca, modelli });
  }
  return out;
}

/** Conteggio documenti in un nodo marca dell'albero (marca + modelli). */
export function countDocsInMarcaNode(node: ArchiveDocMarcaNode): number {
  return node.filesMarca.length + node.modelli.reduce((n, m) => n + m.files.length, 0);
}

export function getDocumentoFileAccess(doc: DocumentoGestionale): DocumentoFileAccessState {
  return getDocumentoFileAccessState(doc);
}

export function canOpenDocumento(doc: DocumentoGestionale): boolean {
  return getDocumentoFileAccessState(doc).canOpen;
}

export function documentoFileUnavailableLabel(doc: DocumentoGestionale): string | null {
  const access = getDocumentoFileAccessState(doc);
  if (access.canOpen || !access.blockReason) return null;
  return documentoFileAccessBlockLabel(access.blockReason);
}

/** Apre il file via proxy server (RBAC + cache) o blob locale pre-save. */
export async function openDocumentoFile(
  doc: DocumentoGestionale,
  _row?: Pick<DocumentoRow, "url_file">,
): Promise<DocumentoFileOpenResult> {
  const access = getDocumentoFileAccessState(doc);
  if (access.hasLocalBlob && doc.urlBlob?.trim()) {
    window.open(doc.urlBlob.trim(), "_blank", "noopener,noreferrer");
    return { ok: true, href: doc.urlBlob.trim() };
  }
  if (!access.canOpen || !doc.id) {
    const code =
      access.blockReason === "legacy_url_unparsed"
        ? "legacy_unparsed"
        : access.blockReason === "no_file_linked"
          ? "no_path"
          : "unknown";
    return {
      ok: false,
      code,
      message: access.blockReason ? documentoFileAccessBlockLabel(access.blockReason) : documentoFileOpenFailureMessage("no_path"),
    };
  }
  const href = archiveDocumentDeliveryUrl(doc.id, "preview", doc.caricatoIl || doc.ultimaModifica);
  window.open(href, "_blank", "noopener,noreferrer");
  return { ok: true, href };
}

export { documentoFileOpenFailureMessage };

export function extractFileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i <= 0 || i === fileName.length - 1) return "";
  return fileName.slice(i).toLowerCase();
}

/** Nome file senza estensione (per precompilazione campo «Nome file»). */
export function stripFileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i <= 0) return fileName.trim();
  return fileName.slice(0, i).trim();
}

export { formatDocumentoRigaSintetica, labelApplicabilitaBreve, resolveDocumentoApplicazione };
