import { NextResponse } from "next/server";
import { handleImportTemplate } from "@/lib/data-import/core/import-api-router.server";
import { requireImportTemplateAuthBySlug } from "@/lib/data-import/core/import-api-auth.server";

export const runtime = "nodejs";

type Params = { params: Promise<{ entity: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { entity: slug } = await params;
  const auth = await requireImportTemplateAuthBySlug(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const result = handleImportTemplate(slug);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
