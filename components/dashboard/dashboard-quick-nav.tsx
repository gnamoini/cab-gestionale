"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  GESTIONALE_NAV,
  resolveGestionaleNav,
  type GestionaleNavHref,
} from "@/components/gestionale/gestionale-nav-config";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { useAuth } from "@/context/auth-context";
import { shouldHideNavHref } from "@/lib/auth/rbac";
import {
  dsDashboardWidgetTitle,
  dsSurfaceCard,
  dsSurfaceQuickNavTile,
  dsSurfaceQuickNavTileDisabled,
} from "@/lib/ui/design-system";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";
import { isNavTargetCurrent } from "@/src/lib/navigation/route-transition";

const QUICK_NAV_DESC: Partial<Record<GestionaleNavHref, string>> = {
  "/dashboard": "Panoramica operativa",
  "/lavorazioni": "Officina e ordini di lavoro",
  "/preventivi": "Preventivi e quotazioni",
  "/documenti": "Archivio documenti",
  "/magazzino": "Ricambi e giacenze",
  "/mezzi": "Anagrafica mezzi e attrezzature",
  "/dipendenti": "Presenze e ore mensili",
  "/report": "Statistiche e reportistica",
};

function tileActiveClass(active: boolean): string {
  if (!active) return "";
  return "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-card))] shadow-[var(--cab-shadow-sm)] ring-2 ring-inset ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)]";
}

function tileIconClass(active: boolean): string {
  return `flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 ${
    active
      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_40%,var(--cab-border))] bg-[var(--cab-card)] text-[color:var(--cab-primary)]"
      : "border-[color:var(--cab-border)] bg-[var(--cab-card)] text-[color:var(--cab-text-muted)] group-hover:border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] group-hover:text-[color:var(--cab-primary)]"
  }`;
}

function QuickNavTile({
  active,
  disabled,
  href,
  label,
  description,
  badge,
  Icon,
}: {
  active: boolean;
  disabled: boolean;
  href: GestionaleNavHref;
  label: string;
  description: string;
  badge: string | null;
  Icon: (typeof GESTIONALE_NAV)[number]["Icon"];
}) {
  if (disabled) {
    return (
      <div className={dsSurfaceQuickNavTileDisabled} aria-disabled title={badge ?? undefined}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_80%,var(--cab-card))] text-[color:var(--cab-text-muted)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
          <span className="text-xs font-semibold leading-tight text-[color:var(--cab-text-muted)]">{label}</span>
          <span className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">{description}</span>
        </div>
        {badge ? (
          <span className="rounded bg-[color:color-mix(in_srgb,var(--cab-text-muted)_14%,var(--cab-surface))] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            {badge}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${dsSurfaceQuickNavTile} min-w-0 max-w-full ${tileActiveClass(active)} ${erpFocus}`}
      aria-current={active ? "page" : undefined}
    >
      <span className={tileIconClass(active)} aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-col items-center gap-0.5 px-1 text-center">
        <span
          className={`text-xs font-semibold leading-tight ${
            active ? "text-[color:var(--cab-primary)]" : "text-[color:var(--cab-text)]"
          }`}
        >
          {label}
        </span>
        <span className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">{description}</span>
      </div>
    </Link>
  );
}

export function DashboardQuickNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const clientLav = useClientLavorazioniAccess();
  const operatorPilot = useOperatorGlobalSettings();
  const items = useMemo(
    () =>
      resolveGestionaleNav({
        hideHref: (href) =>
          shouldHideNavHref(
            user,
            href,
            {
              clientLavorazioniAllowed: clientLav.allowed,
              clientLavorazioniLoading: clientLav.isLoading,
            },
            { operatorGlobalSettingsDbEnabled: operatorPilot.dbEnabled },
          ),
      }).filter(
        (item) =>
          item.href !== "/dashboard/security" &&
          item.href !== "/impostazioni" &&
          item.href !== "/lavorazioni-clienti" &&
          item.href !== "/bunder",
      ),
    [user, clientLav.allowed, clientLav.isLoading, operatorPilot.dbEnabled],
  );

  return (
    <section className={`${dsSurfaceCard} min-w-0 max-w-full overflow-hidden p-4 sm:p-5`} aria-labelledby="dashboard-quick-nav-title">
      <h2 id="dashboard-quick-nav-title" className={dsDashboardWidgetTitle}>
        Navigazione rapida
      </h2>
      <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const active = isNavTargetCurrent(pathname, item.href);
          const description = QUICK_NAV_DESC[item.href] ?? "Apri modulo";
          return (
            <QuickNavTile
              key={item.href}
              active={active}
              disabled={item.disabled}
              href={item.href}
              label={item.label}
              description={description}
              badge={item.badge}
              Icon={item.Icon}
            />
          );
        })}
      </div>
    </section>
  );
}
