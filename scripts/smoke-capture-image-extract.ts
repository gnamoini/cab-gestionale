/**
 * Smoke locale: estrazione Gemini da immagine scheda ingresso.
 * Uso: npx tsx --env-file=.env.local scripts/smoke-capture-image-extract.ts [path.png]
 */
import fs from "node:fs";
import path from "node:path";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import {
  captureExtractionSchema,
  listCaptureExtractionFields,
} from "@/lib/document-capture/capture-extraction-schema";
import { buildGeminiCaptureDocumentPart } from "@/lib/document-capture/gemini-capture-content";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import { resolveGeminiReportModelId } from "@/lib/ai/gemini-client";
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
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    "";
  if (!apiKey) {
    console.error("Gemini non configurato (.env.local)");
    process.exit(1);
  }
  const bytes = new Uint8Array(fs.readFileSync(imagePath));
  const mime = normalizeCaptureMime({ fileName: path.basename(imagePath), bytes });
  const model = createGoogleGenerativeAI({ apiKey })(resolveGeminiReportModelId());

  const t0 = performance.now();
  const { object } = await generateObject({
    model,
    schema: captureExtractionSchema,
    system: SCHEDA_OFFICINA_EXTRACTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: SCHEDA_OFFICINA_EXTRACTION_USER }, buildGeminiCaptureDocumentPart(bytes, mime)],
      },
    ],
    temperature: 0.2,
  });

  const fields = listCaptureExtractionFields(object.fields);
  console.log(
    JSON.stringify(
      {
        schedaTipo: object.schedaTipo,
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
