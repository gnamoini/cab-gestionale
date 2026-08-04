import "server-only";

import { enqueueCommunicationEvent } from "@/lib/communications/application/enqueue-communication-event.server";
import { addDaysIso } from "@/lib/maintenance-plans/forecast/maintenance-forecast-notify.server";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";

const REMINDER_WINDOWS = [30, 14, 7, 0] as const;

function daysUntil(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export async function runMaintenanceCommunicationReminders(): Promise<{
  scanned: number;
  enqueued: number;
}> {
  const client = createCommunicationAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = addDaysIso(today, 30);

  const { data: forecasts, error } = await client
    .from("vehicle_maintenance_forecasts")
    .select("config_id, next_date_estimated, confidence_level, confidence_pct")
    .not("next_date_estimated", "is", null)
    .lte("next_date_estimated", in30)
    .gte("next_date_estimated", today);

  if (error) throw new Error(error.message);
  if (!forecasts?.length) return { scanned: 0, enqueued: 0 };

  let enqueued = 0;

  for (const f of forecasts) {
    if (f.confidence_level === "bassa" && (f.confidence_pct ?? 0) < 40) continue;

    const nextDate = String(f.next_date_estimated);
    const days = daysUntil(today, nextDate);
    const window = REMINDER_WINDOWS.find((w) => days === w);
    if (window == null) continue;

    const configId = String(f.config_id);
    const idempotencyKey = `comm:maintenance.reminder:${configId}:${window}:${today}`;

    const outboxId = await enqueueCommunicationEvent({
      domainEventType: "maintenance.reminder",
      entityType: "vehicle_maintenance_configs",
      entityId: configId,
      idempotencyKey,
      payload: {
        config_id: configId,
        reminder_date: nextDate,
        window_days: window,
      },
    });

    if (outboxId) enqueued += 1;
  }

  return { scanned: forecasts.length, enqueued };
}
