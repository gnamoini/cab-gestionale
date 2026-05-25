import type { CatalogMacchina, CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import { resolveDocumentoFileUrl } from "@/lib/documenti/documenti-db-mapper";
import {
  formatDocumentoRigaSintetica,
  labelApplicabilitaBreve,
  legacyAssocRefs,
  resolveDocumentoApplicazione,
} from "@/lib/documenti/documenti-applicabilita";
import type { DocumentoAssocRef, DocumentoGestionale, DocumentoTipoFile } from "@/lib/types/gestionale";
import type { MezzoGestito } from "@/lib/mezzi/types";

export function labelCategoria(c: DocumentoGestionale["categoria"]): string {
  switch (c) {
    case "listini":
      return "Listini";
    case "cataloghi":
      return "Cataloghi";
    case "manuali":
      return "Manuali";
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

export function inferTipoFileFromNome(nome: string): DocumentoTipoFile {
  const lower = nome.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) return "immagine";
  if (/\.(xlsx|xls)$/i.test(lower)) return "excel";
  if (/\.(doc|docx)$/i.test(lower)) return "word";
  if (/\.(txt|csv)$/i.test(lower)) return "testo";
  return "altro";
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

const MARCA_NON_ASSEGNATA_SENTINELS = new Set(["", "—", "-", "n/a", "na"]);

/** True se il documento non ha una marca valida (vuota o segnaposto). */
export function documentoHaMarcaAssegnata(doc: DocumentoGestionale): boolean {
  const r = resolveDocumentoApplicazione(doc);
  const m = (r.marcaKey ?? r.marca).trim().toLowerCase();
  return m.length > 0 && !MARCA_NON_ASSEGNATA_SENTINELS.has(m);
}

export function documentoSenzaMarca(doc: DocumentoGestionale): boolean {
  return !documentoHaMarcaAssegnata(doc);
}

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

function sameMarca(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function sameModello(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
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
    return mar.macchine.some((mac) => sameModello(mac.nome, modNome));
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
  const out: ArchiveDocMarcaNode[] = [];
  for (const marca of catalog) {
    const filesMarca: DocumentoGestionale[] = [];
    const modelli: ArchiveDocModelloNode[] = [];

    for (const d of sortedDocs) {
      if (documentoSenzaMarca(d)) continue;
      const r = resolveDocumentoApplicazione(d);
      if (r.applicabilita === "marca" && sameMarca(r.marcaKey ?? r.marca, marca.nome)) filesMarca.push(d);
    }
    filesMarca.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase, { skipSenzaMarcaPartition: true }));

    for (const mac of marca.macchine) {
      const filesModello: DocumentoGestionale[] = [];
      for (const d of sortedDocs) {
        if (documentoSenzaMarca(d)) continue;
        const r = resolveDocumentoApplicazione(d);
        if (r.applicabilita !== "modello") continue;
        if (!sameMarca(r.marcaKey ?? r.marca, marca.nome)) continue;
        if (!sameModello(r.modelloKey ?? r.macchina, mac.nome)) continue;
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

export function getDocumentApriHref(doc: DocumentoGestionale): string | null {
  const blob = doc.urlBlob?.trim();
  if (blob && /^blob:/i.test(blob)) return blob;
  const ext = doc.urlDocumento?.trim();
  if (ext) return resolveDocumentoFileUrl({ url_file: ext }, doc);
  return null;
}

export function extractFileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i <= 0 || i === fileName.length - 1) return "";
  return fileName.slice(i).toLowerCase();
}

export { formatDocumentoRigaSintetica, labelApplicabilitaBreve, resolveDocumentoApplicazione };
