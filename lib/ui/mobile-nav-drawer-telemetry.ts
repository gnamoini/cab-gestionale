import { incrementHealthCounter } from "@/lib/observability/runtime-health";

export type DrawerTelemetryEvent =
  | "drawer_open"
  | "drawer_close"
  | "drawer_cancel"
  | "drawer_snap_back"
  | "drawer_velocity_commit"
  | "drawer_force_close"
  | "drawer_stuck_recovered"
  | "drawer_pointer_cancel"
  | "drawer_resize_recovery";

export function recordDrawerTelemetry(
  event: DrawerTelemetryEvent,
  tags?: Record<string, string>,
): void {
  const suffix =
    tags && Object.keys(tags).length > 0
      ? `:${Object.entries(tags)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")}`
      : "";
  incrementHealthCounter(`${event}${suffix}`);
}
