"use client";

import Link from "next/link";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { dsDashboardWidgetTitle, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";

function BacklogRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[color:var(--cab-border)] px-3 py-2 hover:bg-[color:var(--cab-surface-2)]">
      <span className="text-sm text-[color:var(--cab-text-muted)]">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">{value}</span>
    </Link>
  );
}

export function DashboardAdminBacklogWidget() {
  const { slices, canPreventivi, canFatturazione } = useControlTowerContext();
  const admin = slices?.adminBacklog;
  if (!admin) return null;

  const hasPreventivi = canPreventivi && admin.preventiviInAttesa > 0;
  const hasFatture = canFatturazione && (admin.fattureDaEmettere > 0 || admin.fattureScadute > 0);
  if (!hasPreventivi && !hasFatture && admin.preventiviInAttesa === 0 && admin.fattureDaEmettere === 0 && admin.fattureScadute === 0) {
    return (
      <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
        <h2 className={dsDashboardWidgetTitle}>Amministrazione</h2>
        <p className={`${dsTypoCaption} mt-3`}>Nessun backlog operativo.</p>
      </section>
    );
  }

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <h2 className={dsDashboardWidgetTitle}>Backlog amministrativo</h2>
      <div className="mt-3 space-y-2">
        {canPreventivi ? (
          <BacklogRow label="Preventivi in attesa risposta" value={admin.preventiviInAttesa} href="/preventivi" />
        ) : null}
        {canFatturazione ? (
          <>
            <BacklogRow label="Fatture da emettere" value={admin.fattureDaEmettere} href="/fatturazione" />
            <BacklogRow label="Fatture scadute" value={admin.fattureScadute} href="/fatturazione" />
          </>
        ) : null}
      </div>
    </section>
  );
}
