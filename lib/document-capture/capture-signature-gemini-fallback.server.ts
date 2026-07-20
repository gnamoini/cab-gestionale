import "server-only";

import { z } from "zod";
import { aiService } from "@/lib/ai/runtime/service";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import { cropSignatureRegionWithInkRetry } from "@/lib/document-capture/capture-signature-region-crop.server";
import type { CaptureSignatureBbox, CaptureSignatureFieldDraft } from "@/lib/document-capture/capture-signature-crop";
import { buildGeminiCaptureDocumentPart } from "@/lib/document-capture/gemini-capture-content";

const bboxSchema = z.object({
  ymin: z.number().min(0).max(1000),
  xmin: z.number().min(0).max(1000),
  ymax: z.number().min(0).max(1000),
  xmax: z.number().min(0).max(1000),
});

export const captureSignatureBboxSchema = z.object({
  richiedente: bboxSchema.nullable().optional(),
  addetto: bboxSchema.nullable().optional(),
});

type CaptureSignatureBboxResult = z.infer<typeof captureSignatureBboxSchema>;

const SIGNATURE_BBOX_SYSTEM = `Scheda ingresso officina meccanica (foto o PDF).
Individua le caselle firma manoscritte in fondo alla scheda:
- richiedente/autista (etichetta «Firma autista/richiedente»)
- addetto officina (etichetta «Firma addetto officina»)
Restituisci bbox normalizzate 0–1000 (ymin, xmin, ymax, xmax) attorno all'intera casella firma (bordo del riquadro + tratto manoscritto), non all'intera pagina.
Includi un piccolo margine attorno al riquadro. Se la casella è vuota, restituisci comunque la bbox del riquadro.
Se la casella non è visibile, ometti quel campo (null).`;

const SIGNATURE_BBOX_USER =
  "Trova le bbox delle caselle firma richiedente e addetto. Coordinate normalizzate 0–1000 sulla pagina.";

function isValidGeminiBbox(bbox: CaptureSignatureBbox | null | undefined): bbox is CaptureSignatureBbox {
  if (!bbox) return false;
  const w = bbox.xmax - bbox.xmin;
  const h = bbox.ymax - bbox.ymin;
  return w >= 8 && h >= 8 && bbox.xmax > bbox.xmin && bbox.ymax > bbox.ymin;
}

/** ponytail: fallback solo se ritaglio template fallisce — upgrade: page detect */
export async function extractCaptureSignatureFieldsGeminiFallback(input: {
  bytes: Uint8Array;
  mime: string;
  missingKeys: readonly ("firma_richiedente" | "firma_addetto")[];
}): Promise<CaptureSignatureFieldDraft[]> {
  if (input.missingKeys.length === 0) return [];

  const aiStatus = await aiService.getConfigurationStatus();
  if (!aiStatus.configured) return [];

  const aiResult = await aiService.analyzeDocument<CaptureSignatureBboxResult>({
    schema: captureSignatureBboxSchema,
    system: SIGNATURE_BBOX_SYSTEM,
    userContent: [
      {
        role: "user",
        content: [
          { type: "text", text: SIGNATURE_BBOX_USER },
          buildGeminiCaptureDocumentPart(input.bytes, input.mime),
        ],
      },
    ],
    temperature: 0.1,
    timeoutMs: readRuntimeTimeoutMs(),
  });

  if (!aiResult.ok) return [];

  const out: CaptureSignatureFieldDraft[] = [];
  const regions: Array<{ key: "firma_richiedente" | "firma_addetto"; bbox: CaptureSignatureBbox | null | undefined }> = [
    { key: "firma_richiedente", bbox: aiResult.data.object.richiedente },
    { key: "firma_addetto", bbox: aiResult.data.object.addetto },
  ];

  for (const region of regions) {
    if (!input.missingKeys.includes(region.key)) continue;
    if (!isValidGeminiBbox(region.bbox)) continue;
    const dataUrl = await cropSignatureRegionWithInkRetry({
      bytes: input.bytes,
      mime: input.mime,
      bbox: region.bbox,
    });
    if (!dataUrl) continue;
    out.push({
      field_key: region.key,
      raw_value: dataUrl,
      normalized_value: dataUrl,
      confidence: 0.5,
    });
  }

  return out;
}
