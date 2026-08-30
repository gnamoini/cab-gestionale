import { NextResponse } from "next/server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { sendComposedCommunicationDraftServer } from "@/lib/communications/composed/send-composed-communication.server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  const { draftId } = await context.params;
  let body: { ordineId?: string } = {};
  try {
    body = (await request.json()) as { ordineId?: string };
  } catch {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const ordineId = body.ordineId?.trim();
  if (!ordineId) {
    return NextResponse.json({ error: "Ordine obbligatorio." }, { status: 400 });
  }

  const result = await sendComposedCommunicationDraftServer(draftId, ordineId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Permesso richiesto." ? 403 : 400 });
  }
  return NextResponse.json({ ok: true, logId: result.data?.logId });
}
