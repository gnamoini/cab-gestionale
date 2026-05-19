"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  GESTIONALE_NAV,
  resolveGestionaleNav,
  type GestionaleNavHref,
} from "@/components/gestionale/gestionale-nav-config";
import { useAuth } from "@/context/auth-context";
import { shouldHideNavHref } from "@/lib/auth/rbac";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { dsSurfaceQuickNavTile, dsTypoCardTitle, dsTypoSmall } from "@/lib/ui/design-system";
import { isNavTargetCurrent } from "@/src/lib/navigation/route-transition";

const QUICK_NAV_DESC: Partial<Record<GestionaleNavHref, string>> = {
  "/dashboard": "Panoramica operativa",
  "/lavorazioni": "Officina e ordini di lavoro",
  "/preventivi": "Preventivi e quotazioni",
  "/documenti": "Archivio documenti",
  "/magazzino": "Ricambi e giacenze",
  "/mezzi": "Anagrafica mezzi e attrezzature",
  "/bunder": "Modulo BUNDER",
  "/report": "Statistiche e reportistica",
};

function tileActiveClass(active: boolean): string {
  if (!active) return "";
  return "border-[color:color-mix(in_srgb,var(--cab-primary)_32%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-card))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_22%,transparent),var(--cab-shadow-sm)] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-r before:bg-[var(--cab-primary)]";
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
      <div
        className={`${dsSurfaceQuickNavTile} cursor-not-allowed border-dashed opacity-75`}
        aria-disabled
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--cab-surface-2)_85%,var(--cab-card))] text-[color:var(--cab-text-muted)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <span className="block text-sm font-semibold text-[color:var(--cab-text-muted)]">{label}</span>
          <span className="block text-xs leading-snug text-[color:var(--cab-text-muted)]">{description}</span>
        </div>
        {badge ? (
          <span className="absolute right-3 top-3 rounded bg-[color:color-mix(in_srgb,var(--cab-text-muted)_14%,var(--cab-surface))] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            {badge}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${dsSurfaceQuickNavTile} ${tileActiveClass(active)}`}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
          active
            ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_24%,var(--cab-card))] text-[color:var(--cab-primary)]"
            : "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,var(--cab-text))] group-hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-card))] group-hover:text-[color:var(--cab-primary)]"
        }`}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 space-y-0.5 pr-6">
        <span
          className={`block text-sm font-semibold leading-snug ${
            active ? "text-[color:var(--cab-primary)]" : "text-[color:var(--cab-text)]"
          }`}
        >
          {label}
        </span>
        <span className="block text-xs leading-snug text-[color:var(--cab-text-muted)]">{description}</span>
      </div>
    </Link>
  );
}

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
    <section aria-labelledby="dashboard-quick-nav-title">
      <div className="mb-4">
        <h2 id="dashboard-quick-nav-title" className={dsTypoCardTitle}>
          Navigazione rapida
        </h2>
        <p className={`${dsTypoSmall} mt-1 text-[color:var(--cab-text-muted)]`}>
          Accesso diretto ai moduli principali del gestionale
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
