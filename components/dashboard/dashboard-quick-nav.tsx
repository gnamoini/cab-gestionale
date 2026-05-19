"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { resolveGestionaleNav } from "@/components/gestionale/gestionale-nav-config";
import { useAuth } from "@/context/auth-context";
import { shouldHideNavHref } from "@/lib/auth/rbac";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { dsSurfaceCard, dsTypoCardTitle } from "@/lib/ui/design-system";
import { isNavTargetCurrent } from "@/src/lib/navigation/route-transition";

export function DashboardQuickNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const clientLav = useClientLavorazioniAccess();
  const items = useMemo(
    () =>
      resolveGestionaleNav({
        hideHref: (href) =>
          shouldHideNavHref(user, href, {
            clientLavorazioniAllowed: clientLav.allowed,
            clientLavorazioniLoading: clientLav.isLoading,
          }),
      }).filter(
        (item) =>
          item.href !== "/supporto" &&
          item.href !== "/dashboard/security" &&
          item.href !== "/impostazioni" &&
          item.href !== "/lavorazioni-clienti",
      ),
    [user, clientLav.allowed, clientLav.isLoading],
  );

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <h2 className={dsTypoCardTitle}>Navigazione rapida</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const active = isNavTargetCurrent(pathname, item.href);
          const Icon = item.Icon;
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center opacity-70 dark:border-zinc-700 dark:bg-zinc-900/40"
                aria-disabled
              >
                <Icon className="h-5 w-5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500">{item.label}</span>
                {item.badge ? (
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-4 text-center shadow-sm transition hover:border-orange-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-orange-900/50 ${
                active ? "ring-2 ring-orange-500/30" : ""
              } ${erpFocus}`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-orange-600" : "text-zinc-500"}`} />
              <span className={`text-xs font-semibold ${active ? "text-orange-700 dark:text-orange-300" : "text-zinc-700 dark:text-zinc-200"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
