import { adminCreateCliente, type ClienteAdminPayload } from "@/lib/admin-master-data/cliente-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ClienteAdminPayload;
    const id = await adminCreateCliente(payload);
    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore creazione cliente";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
