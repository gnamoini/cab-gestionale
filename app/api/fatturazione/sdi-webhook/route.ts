import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.SDI_WEBHOOK_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret || !auth) return false;
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (token.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
  const invoiceId = String(body.invoice_id ?? body.invoiceId ?? "");
  const outcome = String(body.outcome ?? body.status ?? "");
  const notificationId = String(body.notification_id ?? body.id ?? "").trim();
  if (!invoiceId || !outcome) {
    return NextResponse.json({ error: "invoice_id e outcome obbligatori" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readSupabaseServiceRoleKey();
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const sb = createClient(url, key);
  if (notificationId) {
    const { error: dupErr } = await sb.from("invoice_sdi_webhook_receipts").insert({
      notification_id: notificationId,
      invoice_id: invoiceId,
      outcome,
    });
    if (dupErr) {
      const code = String(dupErr.code ?? "");
      const msg = String(dupErr.message ?? "");
      if (code === "23505" || /duplicate|unique/i.test(msg)) {
        return NextResponse.json({ ok: true, duplicate: true, notification_id: notificationId });
      }
      return NextResponse.json({ error: dupErr.message }, { status: 400 });
    }
  }
  const rawCode = body.raw_sdi_event_code ?? body.raw_code ?? null;
  const { error } = await sb.rpc("apply_sdi_event", {
    p_payload: {
      invoice_id: invoiceId,
      transmission_id: body.transmission_id ?? null,
      canonical_event_type: outcome,
      raw_sdi_event_code: rawCode,
      idempotency_key: notificationId || `webhook:${invoiceId}:${outcome}:${Date.now()}`,
      payload_hash: notificationId || outcome,
      provider_event_id: notificationId || null,
      sdi_identifier: body.sdi_identifier ?? null,
      parsed_code: body.parsed_code ?? rawCode,
      parsed_message: body.reason ?? body.message ?? null,
      event_payload: body,
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, received: true, notification_id: notificationId });
}
