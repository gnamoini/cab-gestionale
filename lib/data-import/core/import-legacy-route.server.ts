import "server-only";

import { NextResponse } from "next/server";
import {
  handleImportExecute,
  handleImportParse,
  handleImportPreview,
  handleImportTemplate,
} from "@/lib/data-import/core/import-api-router.server";
import {
  requireImportAuthBySlug,
  requireImportTemplateAuthBySlug,
} from "@/lib/data-import/core/import-api-auth.server";

async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Body JSON non valido" }, { status: 400 }) };
  }
}

export async function legacyImportParseRoute(slug: string, request: Request) {
  const auth = await requireImportAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const result = await handleImportParse(slug, body.body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function legacyImportPreviewRoute(slug: string, request: Request) {
  const auth = await requireImportAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const result = await handleImportPreview(slug, auth.userId, body.body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function legacyImportExecuteRoute(slug: string, request: Request) {
  const auth = await requireImportAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const result = await handleImportExecute(slug, auth.userId, body.body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function legacyImportTemplateRoute(slug: string) {
  const auth = await requireImportTemplateAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const result = handleImportTemplate(slug);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
