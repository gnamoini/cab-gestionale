import { NextResponse } from "next/server";
import { handleExportEntity } from "@/lib/data-import/core/export-runner.server";
import { requireImportAuthBySlug } from "@/lib/data-import/core/import-api-auth.server";
import { entityIdFromRouteSlug } from "@/lib/data-import/registry";
import type { ExportMode } from "@/lib/data-import/core/field-schema";

export const runtime = "nodejs";

type Params = { params: Promise<{ entity: string }> };

export async function GET(request: Request, { params }: Params) {
  const { entity: slug } = await params;
  const auth = await requireImportAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const entity = entityIdFromRouteSlug(slug);
  if (!entity) return NextResponse.json({ error: "Entità sconosciuta" }, { status: 404 });

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "xlsx") as "csv" | "xlsx" | "zip";
  const mode = (url.searchParams.get("mode") ?? "importable") as ExportMode;
  const scope: Record<string, unknown> = {};
  const archived = url.searchParams.get("archived");
  if (archived === "true") scope.archived = true;
  if (archived === "false") scope.archived = false;

  try {
    const buffer = await handleExportEntity(entity, format === "zip" ? "xlsx" : format, {
      userId: auth.userId,
      mode,
      scope,
    });
    const contentType =
      format === "csv"
        ? "text/csv"
        : format === "zip"
          ? "application/gzip"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="export-${slug}-${mode}.${format}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Export non riuscito" }, { status: 400 });
  }
}
