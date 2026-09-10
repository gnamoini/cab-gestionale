import { adminCreateFornitore, type FornitoreAdminPayload } from "@/lib/admin-master-data/fornitore-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as FornitoreAdminPayload;
    const id = await adminCreateFornitore(payload);
    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore creazione fornitore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
