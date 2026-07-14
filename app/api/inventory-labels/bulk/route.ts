import { NextResponse } from "next/server";
import {
  requireInventoryLabelsRead,
  requireInventoryLabelsWrite,
  requestOrigin,
} from "@/lib/inventory-labels/api-auth.server";
import { createBulkLabelJob, renderBulkLabelPdfSync } from "@/lib/inventory-labels/jobs/bulk-label-job.server";
import { bulkLabelRequestSchema, isBulkSyncCount } from "@/lib/inventory-labels/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireInventoryLabelsWrite();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.userId) return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = bulkLabelRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida", details: parsed.error.flatten() }, { status: 400 });
  }

  const { ids, preset } = parsed.data;
  const origin = requestOrigin(request);

  if (isBulkSyncCount(ids.length)) {
    try {
      const bytes = await renderBulkLabelPdfSync({
        entityIds: ids,
        preset,
        userId: auth.userId,
        origin,
      });
      return new Response(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="etichette-${ids.length}.pdf"`,
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Generazione bulk fallita" },
        { status: 500 },
      );
    }
  }

  try {
    const jobId = await createBulkLabelJob({
      entityIds: ids,
      preset,
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
  return NextResponse.json({ syncMax: 100, absoluteMax: 1000 });
}
