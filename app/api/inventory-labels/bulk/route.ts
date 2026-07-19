import { NextResponse } from "next/server";
import {
  requireInventoryLabelsRead,
  requireInventoryLabelsWrite,
  requestOrigin,
} from "@/lib/inventory-labels/api-auth.server";
import { isInventoryLabelsBulkRateLimited } from "@/lib/inventory-labels/api-rate-limit.server";
import { createBulkLabelJob, renderBulkLabelPdfSync } from "@/lib/inventory-labels/jobs/bulk-label-job.server";
import { LabelPdfTimeoutError } from "@/lib/inventory-labels/render/pdf-timeout";
import { bulkLabelRequestSchema, BULK_SYNC_MAX, BULK_ABSOLUTE_MAX, isBulkSyncCount } from "@/lib/inventory-labels/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

function bulkFilename(count: number, ext: string): string {
  return `etichette-${count}.${ext}`;
}

export async function POST(request: Request) {
  const auth = await requireInventoryLabelsWrite();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.userId) return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });

  if (await isInventoryLabelsBulkRateLimited(auth.userId)) {
    return NextResponse.json({ error: "Troppe richieste bulk etichette. Riprova tra un minuto." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bulkLabelRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida", details: parsed.error.flatten() }, { status: 400 });
  }

  const { ids, preset, includeBarcode } = parsed.data;
  const origin = requestOrigin(request);

  if (isBulkSyncCount(ids.length)) {
    try {
      const { bytes, contentType, pipeline, skippedIds, cacheHitCount, cacheMissCount, durationMs } =
        await renderBulkLabelPdfSync({
          entityIds: ids,
          preset,
          includeBarcode,
          userId: auth.userId,
          origin,
        });
      const ext = contentType === "application/zip" ? "zip" : "pdf";
      return new Response(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${bulkFilename(ids.length, ext)}"`,
          "X-Label-Pdf-Pipeline": pipeline,
          "X-Label-Duration-Ms": String(durationMs),
          "X-Label-Cache": `HIT:${cacheHitCount},MISS:${cacheMissCount}`,
          "X-Label-Skipped-Count": String(skippedIds.length),
        },
      });
    } catch (e) {
      const status = e instanceof LabelPdfTimeoutError ? 504 : 500;
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Generazione bulk fallita",
          errorCode: e instanceof LabelPdfTimeoutError ? e.code : "LABEL_PDF_FAILED",
        },
        { status },
      );
    }
  }

  try {
    const jobId = await createBulkLabelJob({
      entityIds: ids,
      preset,
      includeBarcode,
      userId: auth.userId,
      origin,
    });
    return NextResponse.json({ jobId, async: true }, { status: 202 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Creazione job fallita" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const auth = await requireInventoryLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ syncMax: BULK_SYNC_MAX, absoluteMax: BULK_ABSOLUTE_MAX });
}
