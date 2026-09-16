import { NextResponse } from "next/server";
import { buildLavorazioniMezzoLabelsBulkPdfResponse } from "@/lib/lavorazioni/lavorazioni-mezzo-labels-bulk-route.server";
import { requireLavorazioniMezzoLabelsRead } from "@/lib/lavorazioni/lavorazioni-mezzo-labels-api-auth.server";
import {
  lavorazioniMezzoLabelBulkRequestSchema,
  workOrderBulkIdsFromSearchParams,
} from "@/lib/lavorazioni/lavorazioni-mezzo-labels-validation";
import { requestOrigin } from "@/lib/mezzo-labels/api-auth.server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await requireLavorazioniMezzoLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "pdf";
  if (format !== "pdf") {
    return NextResponse.json({ error: "Il bulk supporta solo format=pdf" }, { status: 400 });
  }

  return buildLavorazioniMezzoLabelsBulkPdfResponse({
    userSb: auth.sb,
    workOrderIds: workOrderBulkIdsFromSearchParams(url.searchParams),
    origin: requestOrigin(request),
    userId: auth.userId,
    device: request.headers.get("user-agent"),
  });
}

export async function POST(request: Request) {
  const auth = await requireLavorazioniMezzoLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const parsed = lavorazioniMezzoLabelBulkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida", details: parsed.error.flatten() }, { status: 400 });
  }

  const { workOrderIds, format } = parsed.data;
  if (format !== "pdf") {
    return NextResponse.json({ error: "Il bulk supporta solo format=pdf" }, { status: 400 });
  }

  return buildLavorazioniMezzoLabelsBulkPdfResponse({
    userSb: auth.sb,
    workOrderIds,
    origin: requestOrigin(request),
    userId: auth.userId,
    device: request.headers.get("user-agent"),
  });
}
