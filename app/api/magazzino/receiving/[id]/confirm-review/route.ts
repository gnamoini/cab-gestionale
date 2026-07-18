import { NextResponse } from "next/server";
import { confirmDdtReceivingReview } from "@/lib/inventory-receiving/extraction/ddt-extraction-processor.server";
import { ddtReceivingConfirmReviewSchema } from "@/lib/inventory-receiving/extraction/ddt-extraction-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const canWrite = await verifyServerPageWrite("magazzino_carichi");
  if (!canWrite) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = ddtReceivingConfirmReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const result = await confirmDdtReceivingReview(id, parsed.data.decisions);
  return NextResponse.json(result);
}
