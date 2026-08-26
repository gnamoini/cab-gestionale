import { NextResponse } from "next/server";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const allowed = await verifyServerPageWrite("impostazioni");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso richiesto." }, { status: 403 });
  }

  const url = new URL(request.url);
  const clienteId = url.searchParams.get("clienteId");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const client = createCommunicationAdminClient();
  let query = client
    .from("communication_log")
    .select(
      "id, created_at, domain_event_type, template_key, subject, status, intended_recipient_email, actual_recipient_email, communication_target_type",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (clienteId) {
    query = query.eq("cliente_id", clienteId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
