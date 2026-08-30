import { NextResponse } from "next/server";
import { requireInventoryLabelsWrite, requestOrigin } from "@/lib/inventory-labels/api-auth.server";
import { createBulkLabelJob } from "@/lib/inventory-labels/jobs/bulk-label-job.server";
import { bulkLabelRequestSchema, normalizeBulkLabelRequest } from "@/lib/inventory-labels/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireInventoryLabelsWrite();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.userId) return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = bulkLabelRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  try {
    const normalized = normalizeBulkLabelRequest(parsed.data);
    const jobId = await createBulkLabelJob({
      items: normalized.items,
      preset: normalized.preset,
      clienteLabel: normalized.clienteLabel,
      userId: auth.userId,
      origin: requestOrigin(request),
    });
    return NextResponse.json({ jobId }, { status: 202 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Creazione job fallita" },
      { status: 500 },
    );
  }
}
