import type { DocumentoGestionale, DocumentoTipoFile } from "@/lib/types/gestionale";

export function inferTipoFileFromNome(nome: string): DocumentoTipoFile {
  const lower = nome.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) return "immagine";
  if (/\.(xlsx|xls)$/i.test(lower)) return "excel";
  if (/\.(doc|docx)$/i.test(lower)) return "word";
  if (/\.(txt|csv)$/i.test(lower)) return "testo";
  return "altro";
}

function isDocumentoTipoFile(value: unknown): value is DocumentoTipoFile {
  return (
    value === "pdf" ||
    value === "immagine" ||
    value === "excel" ||
    value === "word" ||
    value === "testo" ||
    value === "altro"
  );
}

function readMetaMime(meta: Record<string, unknown>): string | null {
  const raw = meta.mimeType ?? meta.contentType;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function tipoFileFromMime(mime: string): DocumentoTipoFile | null {
  const normalized = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalized === "application/pdf") return "pdf";
  if (normalized.startsWith("image/")) return "immagine";
  if (
    normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    normalized === "application/vnd.ms-excel"
  ) {
    return "excel";
  }
  if (
    normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "application/msword"
  ) {
    return "word";
  }
  if (normalized === "text/plain" || normalized === "text/csv") return "testo";
  return null;
}

function isCertificazioniCategoria(categoria?: string | null): boolean {
  return categoria === "certificazioni" || categoria === "certificazione";
}

/** Deduce tipo file da meta, path storage e nome (non solo suffisso URL grezzo). */
export function resolveDocumentoTipoFile(input: {
  urlFile: string;
  nome: string;
  meta?: Record<string, unknown> | null;
  categoria?: DocumentoGestionale["categoria"] | "certificazione" | null;
}): DocumentoTipoFile {
  const meta = input.meta ?? {};
  // ponytail: "altro" in meta è fallback salvato — non bloccare inferenza da estensione/path.
  if (isDocumentoTipoFile(meta.tipoFile) && meta.tipoFile !== "altro") return meta.tipoFile;

  const fromMime = readMetaMime(meta);
  if (fromMime) {
    const tipo = tipoFileFromMime(fromMime);
    if (tipo) return tipo;
  }

  const extRaw = typeof meta.fileEstensione === "string" ? meta.fileEstensione.trim() : "";
  if (extRaw) {
    const ext = extRaw.startsWith(".") ? extRaw : `.${extRaw}`;
    const fromExt = inferTipoFileFromNome(`file${ext}`);
    if (fromExt !== "altro") return fromExt;
  }

  let path = input.urlFile.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    /* path non encoded */
  }
  path = (path.split("?")[0] ?? "").split("#")[0] ?? "";
  const baseName = path.split("/").pop() ?? "";
  const fromPath = inferTipoFileFromNome(baseName);
  if (fromPath !== "altro") return fromPath;
  if (/\.pdf(?:$|[/?#])/i.test(path)) return "pdf";

  const fromNome = inferTipoFileFromNome(input.nome);
  if (fromNome !== "altro") return fromNome;

  // ponytail: certificazioni legacy senza estensione in storage → quasi sempre PDF.
  if (isCertificazioniCategoria(input.categoria)) return "pdf";

  return "altro";
}

/** Nome file con estensione per delivery/import quando meta.nome è senza suffisso. */
export function resolveArchiveDocumentDisplayFileName(input: {
  nome: string;
  urlFile: string;
  meta?: Record<string, unknown> | null;
  categoria?: DocumentoGestionale["categoria"] | "certificazione" | null;
}): string {
  const nome = input.nome.trim() || input.urlFile.split("/").pop() || "documento";
  if (/\.[a-z0-9]{2,8}$/i.test(nome)) return nome;

  const meta = input.meta ?? {};
  const extRaw = typeof meta.fileEstensione === "string" ? meta.fileEstensione.trim() : "";
  if (extRaw) {
    const ext = extRaw.startsWith(".") ? extRaw : `.${extRaw}`;
    return `${nome}${ext}`;
  }

  const tipoToExt: Partial<Record<DocumentoTipoFile, string>> = {
    pdf: ".pdf",
    excel: ".xlsx",
    word: ".docx",
    testo: ".txt",
    immagine: ".png",
  };
  const tipo = resolveDocumentoTipoFile(input);
  const ext = tipoToExt[tipo];
  return ext ? `${nome}${ext}` : nome;
}
