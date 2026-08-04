import { NextResponse } from "next/server";
import { sendCommunicationTestEmailServer } from "@/lib/communications/application/send-test-email.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { testEmailAddress?: string } = {};
  try {
    body = (await request.json()) as { testEmailAddress?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }

  const email = typeof body.testEmailAddress === "string" ? body.testEmailAddress : "";

  try {
    const result = await sendCommunicationTestEmailServer(email);

    if (!result.success) {
      const status = result.error === "Permesso richiesto." ? 403 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, messageId: result.data?.messageId });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Errore invio email di prova.";
    console.error("[communications/test-send]", e);
    return NextResponse.json({ error: `Errore invio email: ${message}` }, { status: 500 });
  }
}
