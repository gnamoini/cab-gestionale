"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { GESTIONALE_NAV } from "@/components/gestionale/gestionale-nav-config";
import { dsSurfaceCard, dsTypoCardTitle } from "@/lib/ui/design-system";

const DASHBOARD_QUICK_NAV = GESTIONALE_NAV.filter((item) => item.href !== "/supporto");

export function DashboardQuickNav() {
  const pathname = usePathname();

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <h2 className={dsTypoCardTitle}>Navigazione rapida</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {DASHBOARD_QUICK_NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.98] ${erpFocus} ${
                active
                  ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-card))] text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)]"
                  : "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] text-[color:var(--cab-text)]"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                  active
                    ? "border-[color:color-mix(in_srgb,var(--cab-primary)_40%,var(--cab-border))] bg-[var(--cab-card)] text-[color:var(--cab-primary)]"
                    : "border-[color:var(--cab-border)] bg-[var(--cab-card)] text-[color:var(--cab-text-muted)] group-hover:border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] group-hover:text-[color:var(--cab-primary)]"
                }`}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
