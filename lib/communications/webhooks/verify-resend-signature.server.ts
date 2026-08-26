import "server-only";

import { Webhook } from "svix";

export function verifyResendWebhookSignature(
  payload: string,
  headers: Headers,
  secret: string,
): void {
  const wh = new Webhook(secret);
  wh.verify(payload, {
    "svix-id": headers.get("svix-id") ?? "",
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  });
}
