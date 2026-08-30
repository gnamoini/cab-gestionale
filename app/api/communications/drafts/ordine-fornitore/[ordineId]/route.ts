import { NextResponse } from "next/server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  communicationDraftUpsertSchema,
} from "@/lib/communications/drafts/communication-draft-types";
import {
  getOrdineFornitoreEmailDraftServer,
  upsertOrdineFornitoreEmailDraftServer,
} from "@/lib/communications/drafts/communication-draft.server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ordineId: string }> },
) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  const { ordineId } = await context.params;
  const result = await getOrdineFornitoreEmailDraftServer(ordineId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Permesso richiesto." ? 403 : 400 });
  }
  return NextResponse.json(result.data);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ ordineId: string }> },
) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  const { ordineId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const parsed = communicationDraftUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati email non validi." }, { status: 400 });
  }

  const result = await upsertOrdineFornitoreEmailDraftServer(ordineId, {
    senderEmail: parsed.data.senderEmail,
    senderDisplayName: parsed.data.senderDisplayName,
    toEmails: parsed.data.toEmails,
    ccEmails: parsed.data.ccEmails ?? [],
    bccEmails: parsed.data.bccEmails ?? [],
    subject: parsed.data.subject,
    bodyText: parsed.data.bodyText,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Permesso richiesto." ? 403 : 400 });
  }
  return NextResponse.json({ ok: true, draftId: result.data?.draftId });
}
