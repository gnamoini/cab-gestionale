"use client";

import dynamic from "next/dynamic";
import { LoadingCardSkeleton } from "@/components/design-system";
import { useCalendarV2Enabled } from "@/src/hooks/use-calendar-v2-enabled";

const CalendarV2Section = dynamic(
  () => import("@/components/dashboard/calendar-v2/calendar-v2-section").then((m) => m.CalendarV2Section),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[8rem]" /> },
);
const DashboardPromemoriaSection = dynamic(
  () =>
    import("@/components/dashboard/promemoria/dashboard-promemoria-section").then(
      (m) => m.DashboardPromemoriaSection,
    ),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[8rem]" /> },
);

/** Compat renderer — calendario dashboard completo (non lista T+7). */
export function DashboardOperationalCalendarWidget() {
  const calendarV2Enabled = useCalendarV2Enabled();
  return calendarV2Enabled ? <CalendarV2Section /> : <DashboardPromemoriaSection />;
}
