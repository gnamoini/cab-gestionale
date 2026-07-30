import { NextResponse } from "next/server";
import { abandonInventoryReceivingDocument } from "@/lib/inventory-receiving/documents/inventory-receiving-abandon.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await abandonInventoryReceivingDocument(id, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Annullamento non riuscito";
    const code = (e as Error & { code?: string }).code;
    const status =
      code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "invalid_status_transition" ? 409 : 400;
    return NextResponse.json({ error: message, code: code ?? "ABANDON_FAILED" }, { status });
  }
}
