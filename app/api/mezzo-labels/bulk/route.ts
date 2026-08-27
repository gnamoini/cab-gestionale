import { NextResponse } from "next/server";
import { requireMezzoLabelsRead, requestOrigin } from "@/lib/mezzo-labels/api-auth.server";
import { buildMezzoLabelsBulkPdfResponse } from "@/lib/mezzo-labels/bulk-pdf-route.server";
import {
  mezzoBulkIdsFromSearchParams,
  mezzoLabelBulkRequestSchema,
} from "@/lib/mezzo-labels/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await requireMezzoLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "pdf";
  if (format !== "pdf") {
    return NextResponse.json({ error: "Il bulk supporta solo format=pdf" }, { status: 400 });
  }

  return buildMezzoLabelsBulkPdfResponse({
    sb: auth.sb,
    ids: mezzoBulkIdsFromSearchParams(url.searchParams),
    origin: requestOrigin(request),
    userId: auth.userId,
    device: request.headers.get("user-agent"),
  });
}

export async function POST(request: Request) {
  const auth = await requireMezzoLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const parsed = mezzoLabelBulkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mezzoIds, selectAllMatching, format } = parsed.data;
  if (format !== "pdf") {
    return NextResponse.json({ error: "Il bulk supporta solo format=pdf" }, { status: 400 });
  }

  if (selectAllMatching) {
    return NextResponse.json(
      { error: "selectAllMatching non ancora disponibile — usare mezzoIds" },
      { status: 501 },
    );
  }

  return buildMezzoLabelsBulkPdfResponse({
    sb: auth.sb,
    ids: mezzoIds ?? [],
    origin: requestOrigin(request),
    userId: auth.userId,
    device: request.headers.get("user-agent"),
  });
}
