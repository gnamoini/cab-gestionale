import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";

export const runtime = "nodejs";

type PipelineTraceBody = {
  traceId: string;
  stage?: "client_received" | "realtime_emit" | "client_ack";
  notificationId?: string;
  entityId?: string;
  notificationEventId?: string;
  inboxVersion?: number;
  lastEventId?: string;
  error?: string;
};

export async function POST(req: Request) {
  const snap = await resolveServerEffectivePermissions();
  if (
    !snap?.userId ||
    !isStaffInboxEligible({ id: snap.userId, ruolo: snap.role }, { resolved: snap.resolved })
  ) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const body = (await req.json()) as PipelineTraceBody;
  if (!body?.traceId?.trim()) {
    return NextResponse.json({ error: "traceId richiesto" }, { status: 400 });
  }

  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stage = body.stage ?? "client_received";

  const { error } = await client.rpc("cab_log_notification_pipeline_trace", {
    p_trace_id: body.traceId,
    p_stage: stage,
    p_entity_id: body.entityId ?? null,
    p_notification_event_id: body.notificationEventId ?? null,
    p_recipient_count: null,
    p_notifications_created: null,
    p_realtime_delivered: stage === "realtime_emit" || stage === "client_ack" ? true : null,
    p_client_received: stage === "client_received" || stage === "client_ack" ? true : null,
    p_error: body.error ?? null,
    p_meta: {
      notificationId: body.notificationId ?? null,
      inboxVersion: body.inboxVersion ?? null,
      lastEventId: body.lastEventId ?? null,
      userId: snap.userId,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
