import { NextResponse } from "next/server";

/** Webhook stub provider SdI — validazione payload minima. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, received: true });
}
