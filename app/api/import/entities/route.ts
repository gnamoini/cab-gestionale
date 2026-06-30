import { NextResponse } from "next/server";
import { listImportPlugins } from "@/lib/data-import/registry";
import { requireImportSession } from "@/lib/data-import/core/import-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireImportSession();
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const plugins = listImportPlugins().map((p) => ({
    id: p.id,
    routeSlug: p.routeSlug,
    label: p.label,
    status: p.status,
    supportedStrategies: p.supportedStrategies,
    defaultStrategy: p.defaultStrategy,
    exportEnabled: p.exportEnabled ?? false,
    uiEntry: p.uiEntry,
  }));
  return NextResponse.json({ entities: plugins });
}
