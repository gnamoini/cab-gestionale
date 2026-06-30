import { NextResponse } from "next/server";
import { handleImportParse } from "@/lib/data-import/core/import-api-router.server";
import { requireImportAuthBySlug } from "@/lib/data-import/core/import-api-auth.server";

export const runtime = "nodejs";

type Params = { params: Promise<{ entity: string }> };

export async function POST(request: Request, { params }: Params) {
  const { entity: slug } = await params;
  const auth = await requireImportAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const result = await handleImportParse(slug, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
