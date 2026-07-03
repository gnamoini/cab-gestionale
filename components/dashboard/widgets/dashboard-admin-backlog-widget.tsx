"use client";

import Link from "next/link";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { dsDashboardWidgetTitle, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";

function BacklogRow({ label, value, href }: { label: string; value: number; href: string }) {
  const isEmpty = value === 0;
  return (
    <Link
      href={href}
      className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[color:var(--cab-border)] px-3 py-2 transition-colors hover:bg-[color:var(--cab-surface-2)]${isEmpty ? " opacity-70" : ""}`}
    >
      <span className="text-sm text-[color:var(--cab-text-muted)]">{label}</span>
      <span
        className={`text-lg font-semibold tabular-nums${isEmpty ? " text-[color:var(--cab-text-muted)]" : " text-[color:var(--cab-text)]"}`}
      >
        {value}
      </span>
    </Link>
  );
}

export function DashboardAdminBacklogWidget() {
  const { slices, canFatturazione } = useControlTowerContext();
  const admin = slices?.adminBacklog;
  if (!admin) return null;

  const rows: { label: string; value: number; href: string }[] = [];
  if (canFatturazione) {
    rows.push({ label: "Fatture da emettere", value: admin.fattureDaEmettere, href: "/fatturazione" });
    rows.push({ label: "Fatture scadute", value: admin.fattureScadute, href: "/fatturazione" });
  }

  const allZero = rows.length > 0 && rows.every((r) => r.value === 0);

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <h2 className={dsDashboardWidgetTitle}>Backlog amministrativo</h2>
      {rows.length === 0 ? (
        <p className={`${dsTypoCaption} mt-3`}>Modulo fatturazione non disponibile.</p>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {rows.map((row) => (
              <BacklogRow key={row.label} label={row.label} value={row.value} href={row.href} />
            ))}
          </div>
          {allZero ? <p className={`${dsTypoCaption} mt-2.5`}>Nessun backlog operativo — tutto in ordine.</p> : null}
        </>
      )}
    </section>
  );
}
