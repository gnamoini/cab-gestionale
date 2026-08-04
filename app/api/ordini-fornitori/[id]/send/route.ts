import { NextResponse } from "next/server";
import { enqueueOrdineFornitoreSendServer } from "@/lib/ordini-fornitori/ordine-fornitore-send.server";
import { runCommunicationOutboxProcessor } from "@/lib/communications/outbox/communication-outbox-processor.server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await enqueueOrdineFornitoreSendServer(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Permesso richiesto." ? 403 : 400 });
  }

  // ponytail: process inline for immediate feedback; cron handles backlog
  void runCommunicationOutboxProcessor({ limit: 5 }).catch(() => {});

  return NextResponse.json({ ok: true, outboxId: result.data?.outboxId });
}
