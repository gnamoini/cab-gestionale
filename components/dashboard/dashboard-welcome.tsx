"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { CabLogo } from "@/components/gestionale/cab-logo";
import { formatUserDisplayName } from "@/src/lib/auth/resolve-user-display-name";
import { dsSkeletonPulse, dsTypoBody } from "@/lib/ui/design-system";

const welcomeCardClass =
  "relative min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_5%,var(--cab-card))] px-4 py-2.5 shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,#fff_7%,transparent)] sm:px-5 sm:py-3 dark:border-[color:color-mix(in_srgb,var(--cab-primary)_26%,var(--cab-border))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-card))] dark:shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,var(--cab-primary)_14%,transparent)]";

/** logo | copy (sinistra) | spacer | data (destra) */
const welcomeLayoutClass =
  "cab-dashboard-welcome-layout grid min-w-0 max-w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 md:grid-cols-[auto_minmax(0,max-content)_1fr_auto] md:items-center md:gap-x-4";

function timeGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Buongiorno";
  if (hour >= 12 && hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function capitalizeIt(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Parti per blocco data in welcome: giorno, weekday, mese, anno */
function formatWelcomeDate(d: Date): {
  iso: string;
  day: string;
  weekday: string;
  month: string;
  year: string;
} {
  const weekday = capitalizeIt(d.toLocaleDateString("it-IT", { weekday: "long" }));
  const month = d.toLocaleDateString("it-IT", { month: "long" });
  const year = d.toLocaleDateString("it-IT", { year: "numeric" });
  const day = d.toLocaleDateString("it-IT", { day: "numeric" });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { iso, day, weekday, month, year };
}

function WelcomeSkeleton() {
  return (
    <div className={welcomeCardClass} aria-hidden>
      <div className={welcomeLayoutClass}>
        <div className={`cab-dashboard-welcome-logo h-9 w-24 shrink-0 ${dsSkeletonPulse}`} />
        <div className="cab-dashboard-welcome-copy min-w-0 space-y-1.5">
          <div className={`h-3 w-24 ${dsSkeletonPulse} opacity-60`} />
          <div className={`h-6 w-56 max-w-full ${dsSkeletonPulse}`} />
          <div className={`h-4 w-40 max-w-full ${dsSkeletonPulse} opacity-70`} />
        </div>
        <div
          className={`cab-dashboard-welcome-date col-span-2 h-12 border-t border-[var(--cab-border)] pt-3 md:col-span-1 md:h-9 md:border-t-0 md:border-l md:pt-0 md:pl-4 ${dsSkeletonPulse} opacity-50`}
        />
      </div>
    </div>
  );
}

export function DashboardWelcome() {
  const { status, authorName } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { greeting, who, welcomeDate } = useMemo(() => {
    if (!mounted) {
      return {
        greeting: "Buongiorno",
        who: "",
        welcomeDate: { iso: "", day: "", weekday: "", month: "", year: "" },
      };
    }
    const now = new Date();
    const w =
      isAuthSessionEstablished(status) && authorName.trim()
        ? formatUserDisplayName(authorName)
        : "Team CAB";
    return {
      greeting: timeGreeting(now.getHours()),
      who: w,
      welcomeDate: formatWelcomeDate(now),
    };
  }, [mounted, status, authorName]);

  if (!mounted) {
    return <WelcomeSkeleton />;
  }

  return (
    <div className={welcomeCardClass}>
      <div className={welcomeLayoutClass}>
        <div className="cab-dashboard-welcome-logo flex shrink-0 items-center">
          <CabLogo height={36} priority sizes="126px" />
        </div>
        <div className="cab-dashboard-welcome-copy min-w-0">
          <h2 className="text-left text-lg font-semibold leading-tight tracking-tight text-[color:var(--cab-text)] md:text-xl">
            {greeting},{" "}
            <span className="font-bold text-[color:var(--cab-primary)]">{who}</span>
          </h2>
          <p className={`${dsTypoBody} mt-0.5 text-left text-[color:var(--cab-text-muted)]`}>
            Benvenuto nel gestionale officina.
          </p>
        </div>
        <time
          dateTime={welcomeDate.iso}
          className="cab-dashboard-welcome-date col-span-2 min-w-0 w-full shrink-0 border-t-2 border-[color:color-mix(in_srgb,var(--cab-primary)_50%,transparent)] pt-3 text-left md:col-span-1 md:w-auto md:border-t-0 md:border-l-2 md:pt-0 md:pl-4"
          aria-label={`${welcomeDate.weekday}, ${welcomeDate.day} ${welcomeDate.month} ${welcomeDate.year}`}
        >
          <span className="block max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--cab-text-muted)]">
            {welcomeDate.weekday}
          </span>
          <span className="mt-1 block text-2xl font-semibold tabular-nums leading-none tracking-tight text-[color:var(--cab-text)] md:text-4xl">
            {welcomeDate.day}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-[color:var(--cab-text-muted)] md:text-sm">
            <span className="capitalize">{welcomeDate.month}</span>
            <span className="mx-1 tabular-nums">{welcomeDate.year}</span>
          </span>
        </time>
      </div>
    </div>
  );
}
