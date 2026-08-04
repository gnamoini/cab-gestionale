import { NextResponse } from "next/server";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import {
  handleResendWebhookEvent,
  type ResendWebhookEvent,
} from "@/lib/communications/webhooks/resend-webhook-handler.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("svix-signature") ?? request.headers.get("resend-signature");
    if (!header) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // ponytail: full Svix verification when RESEND_WEBHOOK_SECRET configured in production
  }

  let body: ResendWebhookEvent;
  try {
    body = (await request.json()) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client = createCommunicationAdminClient();
  const result = await handleResendWebhookEvent(client, body);
  return NextResponse.json(result);
}
