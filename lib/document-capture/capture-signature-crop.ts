import { hasSignatureDataUrl } from "@/lib/media/signature-pad";
import { ingressoBlankSignatureRegionsNormalized } from "@/lib/document-capture/capture-signature-template";

export type CaptureSignatureBbox = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

type SharpFn = typeof import("sharp").default;

let sharpLoader: Promise<SharpFn | null> | undefined;

/** ponytail: import lazy — evita crash dev server se il binario win32 non carica */
async function loadSharp(): Promise<SharpFn | null> {
  if (!sharpLoader) {
    sharpLoader = import("sharp")
      .then((mod) => mod.default)
      .catch(() => null);
  }
  return sharpLoader;
}

function isValidBbox(bbox: CaptureSignatureBbox): boolean {
  const w = bbox.xmax - bbox.xmin;
  const h = bbox.ymax - bbox.ymin;
  return w >= 8 && h >= 8 && bbox.xmax > bbox.xmin && bbox.ymax > bbox.ymin;
}

function sharpFromCaptureBytes(sharp: SharpFn, bytes: Uint8Array, mime: string) {
  if (mime.toLowerCase().includes("pdf")) {
    return sharp(bytes, { page: 0, density: 150 });
  }
  return sharp(bytes, { failOn: "none" });
}

/** ponytail: crop naive su bbox Gemini — upgrade con deskew/preprocess se serve */
export async function cropNormalizedBboxToPngDataUrl(
  bytes: Uint8Array,
  bbox: CaptureSignatureBbox,
  mime: string,
): Promise<string | null> {
  if (!isValidBbox(bbox)) return null;
  const sharp = await loadSharp();
  if (!sharp) return null;
  try {
    const meta = await sharpFromCaptureBytes(sharp, bytes, mime).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    if (!imgW || !imgH) return null;

    const left = Math.max(0, Math.floor((bbox.xmin / 1000) * imgW));
    const top = Math.max(0, Math.floor((bbox.ymin / 1000) * imgH));
    const width = Math.min(imgW - left, Math.ceil(((bbox.xmax - bbox.xmin) / 1000) * imgW));
    const height = Math.min(imgH - top, Math.ceil(((bbox.ymax - bbox.ymin) / 1000) * imgH));
    if (width < 8 || height < 8) return null;

    const png = await sharpFromCaptureBytes(sharp, bytes, mime)
      .extract({ left, top, width, height })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    if (!png.length) return null;
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    return hasSignatureDataUrl(dataUrl) ? dataUrl : null;
  } catch {
    return null;
  }
}

export function shouldExtractCaptureSignatures(
  schedaTipo?: string | null,
  fieldKeys?: readonly string[],
): boolean {
  if (schedaTipo === "ingresso") return true;
  if (schedaTipo === "lavorazioni" || schedaTipo === "ricambi") return false;
  const keys = fieldKeys?.map((k) => k.trim().toLowerCase()) ?? [];
  if (keys.some((k) => /^riga_\d+_/.test(k))) return false;
  return keys.some(
    (k) => k === "cliente" || k === "data_ingresso" || k.includes("descrizione_anomalia") || k.includes("utilizzatore"),
  );
}

export type CaptureSignatureFieldDraft = {
  field_key: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
};

/** Ritaglio template blank CAB — nessuna chiamata AI. */
export async function extractCaptureSignatureFields(input: {
  bytes: Uint8Array;
  mime: string;
}): Promise<CaptureSignatureFieldDraft[]> {
  const regions = ingressoBlankSignatureRegionsNormalized();
  const out: CaptureSignatureFieldDraft[] = [];

  const richiedente = await cropNormalizedBboxToPngDataUrl(input.bytes, regions.richiedente, input.mime);
  if (hasSignatureDataUrl(richiedente)) {
    out.push({
      field_key: "firma_richiedente",
      raw_value: richiedente!,
      normalized_value: richiedente!,
      confidence: 0.55,
    });
  }

  const addetto = await cropNormalizedBboxToPngDataUrl(input.bytes, regions.addetto, input.mime);
  if (hasSignatureDataUrl(addetto)) {
    out.push({
      field_key: "firma_addetto",
      raw_value: addetto!,
      normalized_value: addetto!,
      confidence: 0.55,
    });
  }

  return out;
}
