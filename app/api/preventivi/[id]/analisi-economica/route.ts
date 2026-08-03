import { NextResponse } from "next/server";
import { loadPreventivoAnalisiEconomicaServer } from "@/lib/preventivi/preventivo-analisi-economica.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const trimmed = id?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Id preventivo non valido" }, { status: 400 });
  }

  const session = await getServerSession();
  const autore = session.user?.nome?.trim() || session.user?.email?.trim() || "Sistema";

  const result = await loadPreventivoAnalisiEconomicaServer(trimmed, autore);
  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Analisi non disponibile" },
      { status: result.error === "Permesso richiesto." ? 403 : 404 },
    );
  }

  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "no-store" },
  });
}
