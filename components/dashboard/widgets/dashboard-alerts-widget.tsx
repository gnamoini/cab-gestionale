"use client";

import Link from "next/link";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { dsDashboardWidgetTitle, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";
import { dsNotificationWidgetDangerRow } from "@/lib/ui/notification-ui";

export function DashboardAlertsWidget() {
  const { slices } = useControlTowerContext();
  const items = slices?.alerts.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className={`${dsSurfaceCard} border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] p-4 sm:p-5`}>
      <h2 className={dsDashboardWidgetTitle}>Alert e anomalie</h2>
      <ul className="mt-3 space-y-2">
        {items.map((a) => (
          <li key={a.id}>
            {a.href ? (
              <Link href={a.href} className={`${dsNotificationWidgetDangerRow} block rounded-lg px-2 py-2 hover:bg-[color:var(--cab-surface-2)]`}>
                <p className="text-sm font-semibold text-[color:var(--cab-text)]">{a.title}</p>
                {a.detail ? <p className={`${dsTypoCaption} mt-0.5`}>{a.detail}</p> : null}
              </Link>
            ) : (
              <div className={dsNotificationWidgetDangerRow}>
                <p className="text-sm font-semibold text-[color:var(--cab-text)]">{a.title}</p>
                {a.detail ? <p className={`${dsTypoCaption} mt-0.5`}>{a.detail}</p> : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
