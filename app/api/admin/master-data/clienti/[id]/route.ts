import { adminUpdateCliente, type ClienteAdminPayload } from "@/lib/admin-master-data/cliente-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<ClienteAdminPayload>;
    await adminUpdateCliente(id, payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore aggiornamento cliente";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
