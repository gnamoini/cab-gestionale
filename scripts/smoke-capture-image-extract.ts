/**
 * Smoke locale: estrazione AI da immagine scheda ingresso.
 * Uso: npx tsx --env-file=.env.local scripts/smoke-capture-image-extract.ts [path.png]
 */
import fs from "node:fs";
import path from "node:path";
import { aiService } from "@/lib/ai/runtime/service";
import {
  captureExtractionSchema,
  listCaptureExtractionFields,
  type CaptureExtractionResult,
} from "@/lib/document-capture/capture-extraction-schema";
import { buildGeminiCaptureDocumentPart } from "@/lib/document-capture/gemini-capture-content";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import {
  SCHEDA_OFFICINA_EXTRACTION_SYSTEM,
  SCHEDA_OFFICINA_EXTRACTION_USER,
} from "@/lib/document-capture/scheda-officina-extraction-prompt";

const defaultImage = path.join(
  process.cwd(),
  "assets/c__Users_gnamo_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Gemini_Generated_Image_g85kzag85kzag85k-c3fd1083-b6f7-48a2-a769-d819772e7886.png",
);

async function main(): Promise<void> {
  const imagePath = process.argv[2] ?? defaultImage;
  const status = await aiService.getConfigurationStatus();
  if (!status.configured) {
    console.error("AI non configurato (.env.local o DB)");
    process.exit(1);
  }
  const bytes = new Uint8Array(fs.readFileSync(imagePath));
  const mime = normalizeCaptureMime({ fileName: path.basename(imagePath), bytes });

  const t0 = performance.now();
  const result = await aiService.analyzeDocument<CaptureExtractionResult>({
    schema: captureExtractionSchema,
    system: SCHEDA_OFFICINA_EXTRACTION_SYSTEM,
    userContent: [
      {
        role: "user",
        content: [{ type: "text", text: SCHEDA_OFFICINA_EXTRACTION_USER }, buildGeminiCaptureDocumentPart(bytes, mime)],
      },
    ],
    temperature: 0.2,
  });

  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  const fields = listCaptureExtractionFields(result.data.object.fields);
  console.log(
    JSON.stringify(
      {
        schedaTipo: result.data.object.schedaTipo,
        fieldCount: fields.length,
        sample: fields.slice(0, 8),
        durationMs: Math.round(performance.now() - t0),
      },
      null,
      2,
    ),
  );
  if (fields.length === 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
