import { NextResponse } from "next/server";
import { resolveClientDocumentsForLavorazioneServer } from "@/lib/official-documents/client/resolve-client-documents.server";
import { resolveStaffDocumentsForLavorazioneServer } from "@/lib/official-documents/staff/resolve-staff-documents.server";
import { verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const surface = new URL(request.url).searchParams.get("surface") === "client" ? "client" : "staff";

  if (surface === "client") {
    const allowed = await verifyClientLavorazioniAccessServer();
    if (!allowed) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }
    const result = await resolveClientDocumentsForLavorazioneServer(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Errore" }, { status: 400 });
    }
    return NextResponse.json(result.data);
  }

  const allowed = await verifyServerPageRead("lavorazioni");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }
  const result = await resolveStaffDocumentsForLavorazioneServer(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Errore" }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
