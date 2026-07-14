import "server-only";

import { runPushDeliveryProcess } from "@/lib/pwa/push-delivery-process.server";
import type { ProcessPushDeliveryResult } from "@/lib/pwa/push-send";

export type { ProcessPushDeliveryResult };

/** ponytail: cron worker — claim batch + web-push su Vercel (env VAPID server-side). */
export async function processPushDeliveryQueue(input?: {
  limit?: number;
}): Promise<ProcessPushDeliveryResult> {
  return runPushDeliveryProcess(input);
}
