"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { publishNotification as publishNotificationCore } from "@/lib/notifications/application/notification-service";
import type { PublishNotificationCommand } from "@/lib/notifications/application/publish-notification-command";

export async function publishNotificationCommand(cmd: PublishNotificationCommand) {
  const client = await getBrowserSupabase();
  return publishNotificationCore(client, cmd);
}
