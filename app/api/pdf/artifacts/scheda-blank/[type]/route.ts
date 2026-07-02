import { NextResponse } from "next/server";
import {
  generateSchedaBlankPdfBytes,
  isSchedaBlankArtifactType,
  persistSchedaPdfGeneration,
  schedaBlankArtifactFileName,
  schedaBlankTipoFromArtifact,
} from "@/lib/document-capture/scheda-blank-pdf.server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ type: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { type } = await context.params;
  if (!isSchedaBlankArtifactType(type)) {
    return NextResponse.json({ error: "Tipo non supportato" }, { status: 404 });
  }

  if (!(await verifyServerModuleCan("document_capture", "read"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const tipo = schedaBlankTipoFromArtifact(type)!;
  const bytes = generateSchedaBlankPdfBytes(tipo);
  await persistSchedaPdfGeneration({ tipo, bytes });
  const fileName = schedaBlankArtifactFileName(tipo);

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
