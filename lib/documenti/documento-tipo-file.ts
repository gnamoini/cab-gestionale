import type { DocumentoTipoFile } from "@/lib/types/gestionale";

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

/** Deduce tipo file da meta, path storage e nome (non solo suffisso URL grezzo). */
export function resolveDocumentoTipoFile(input: {
  urlFile: string;
  nome: string;
  meta?: Record<string, unknown> | null;
}): DocumentoTipoFile {
  const meta = input.meta ?? {};
  if (isDocumentoTipoFile(meta.tipoFile)) return meta.tipoFile;

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

  return "altro";
}
