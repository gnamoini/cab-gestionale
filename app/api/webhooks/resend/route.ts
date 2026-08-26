import { NextResponse } from "next/server";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import {
  handleResendWebhookEvent,
  type ResendWebhookEvent,
} from "@/lib/communications/webhooks/resend-webhook-handler.server";
import { verifyResendWebhookSignature } from "@/lib/communications/webhooks/verify-resend-signature.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  try {
    verifyResendWebhookSignature(rawBody, request.headers, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: ResendWebhookEvent;
  try {
    body = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client = createCommunicationAdminClient();
  const result = await handleResendWebhookEvent(client, body);
  return NextResponse.json(result);
}
