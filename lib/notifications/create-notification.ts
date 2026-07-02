"use client";

import { notificationsService } from "@/src/services/notifications.service";
import type { CreateNotificationInput, CreateNotificationResult } from "@/lib/notifications/notification-types";

const CREATE_RETRY_MS = 2000;

export async function createNotification(
  input: CreateNotificationInput,
  retry = true,
): Promise<CreateNotificationResult> {
  const first = await notificationsService.create(input);
  if (first.success && first.data) return first.data;
  if (!retry) {
    console.warn("[notifications] create failed:", first.error);
    return { id: null, inserted: false };
  }
  await new Promise((r) => setTimeout(r, CREATE_RETRY_MS));
  const second = await notificationsService.create(input);
  if (!second.success || !second.data) {
    console.warn("[notifications] create retry failed:", second.error);
    return { id: null, inserted: false };
  }
  return second.data;
}
