import { NextResponse } from "next/server";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const allowed = await verifyServerPageRead("impostazioni");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso richiesto." }, { status: 403 });
  }

  const { id } = await context.params;
  const client = createCommunicationAdminClient();

  const { data: log, error: logErr } = await client
    .from("communication_log")
    .select("id, status, actual_recipient_email, subject, attachment_refs")
    .eq("id", id)
    .maybeSingle();

  if (logErr || !log) {
    return NextResponse.json({ error: "Log non trovato." }, { status: 404 });
  }

  if (log.status !== "failed" && log.status !== "bounced") {
    return NextResponse.json({ error: "Solo comunicazioni fallite possono essere reinviati." }, { status: 400 });
  }

  await client.from("communication_send_queue").delete().eq("log_id", id);

  const { error: insertErr } = await client.from("communication_send_queue").insert({
    log_id: id,
    payload: {
      to: log.actual_recipient_email,
      subject: log.subject,
      text: "",
      retry: true,
    },
    status: "pending",
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await client
    .from("communication_log")
    .update({ status: "pending", error_message: null, retry_count: 1 })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
