import { NextResponse } from "next/server";
import { createExportJob } from "@/lib/data-import/core/export-jobs.server";
import { requireImportAuthBySlug } from "@/lib/data-import/core/import-api-auth.server";
import { entityIdFromRouteSlug } from "@/lib/data-import/registry";
import type { ExportMode } from "@/lib/data-import/core/field-schema";

export const runtime = "nodejs";

type Params = { params: Promise<{ entity: string }> };

export async function POST(request: Request, { params }: Params) {
  const { entity: slug } = await params;
  const auth = await requireImportAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const entity = entityIdFromRouteSlug(slug);
  if (!entity) return NextResponse.json({ error: "Entità sconosciuta" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    mode?: ExportMode;
    format?: "xlsx" | "csv" | "zip";
    scope?: Record<string, unknown>;
  };

  const jobId = await createExportJob({
    entity,
    userId: auth.userId,
    mode: body.mode ?? "importable",
    format: body.format ?? "xlsx",
    scope: body.scope,
  });

  return NextResponse.json({ jobId });
}
