import { NextResponse } from "next/server";
import { persistDdtOfficialPdfServer } from "@/lib/ddt/ddt-official-pdf.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await persistDdtOfficialPdfServer(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "PDF DDT non generato" }, { status: 400 });
  }
  return NextResponse.json({ artifactId: result.data?.artifactId });
}
