"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { CabLogo } from "@/components/gestionale/cab-logo";
import { DashboardHealthScoreRing } from "@/components/dashboard/dashboard-health-score-ring";
import { formatUserDisplayName } from "@/src/lib/auth/resolve-user-display-name";
import { useOperationalHealthScore } from "@/src/hooks/view/use-operational-health-score";
import { dsSkeletonPulse, dsTypoBody } from "@/lib/ui/design-system";

const dashboardWelcomeCardClass =
  "relative flex min-w-0 max-w-full flex-1 flex-col justify-center overflow-hidden rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_5%,var(--cab-card))] px-4 py-2.5 shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,#fff_7%,transparent)] sm:px-5 sm:py-3 dark:border-[color:color-mix(in_srgb,var(--cab-primary)_26%,var(--cab-border))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-card))] dark:shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,var(--cab-primary)_14%,transparent)]";

const dashboardHealthCardClass =
  "flex min-w-0 shrink-0 flex-col items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] p-3 shadow-[var(--cab-shadow-sm)] md:w-[14.5rem] md:self-stretch";

const headerRowClass =
  "cab-dashboard-header-row flex min-w-0 max-w-full flex-col gap-2.5 md:flex-row md:items-stretch md:gap-3";

/** Mobile: logo+data, copy. Desktop: logo | copy | spacer | data. */
const welcomeLayoutClass =
  "cab-dashboard-welcome-layout grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-1 items-center gap-y-2.5 md:h-full md:grid-cols-[auto_minmax(0,max-content)_1fr_auto] md:gap-x-3";

const welcomeDateClass =
  "cab-dashboard-welcome-date flex shrink-0 flex-col justify-center text-right md:text-left md:border-l-2 md:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,transparent)] md:pl-4";

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
    <div className={headerRowClass} aria-hidden>
      <div className={`${dashboardWelcomeCardClass} min-w-0`}>
        <div className={welcomeLayoutClass}>
          <div className="flex min-w-0 items-center justify-between gap-3 md:contents">
            <div className={`cab-dashboard-welcome-logo h-9 w-24 shrink-0 ${dsSkeletonPulse}`} />
            <div className={`${welcomeDateClass} h-10 w-[4.5rem] ${dsSkeletonPulse} opacity-50`} />
          </div>
          <div className="cab-dashboard-welcome-copy flex min-w-0 flex-col justify-center space-y-1.5">
            <div className={`h-3 w-24 ${dsSkeletonPulse} opacity-60`} />
            <div className={`h-6 w-56 max-w-full ${dsSkeletonPulse}`} />
            <div className={`h-4 w-40 max-w-full ${dsSkeletonPulse} opacity-70`} />
          </div>
        </div>
      </div>
      <div className={dashboardHealthCardClass}>
        <div className={`h-11 w-full rounded-md ${dsSkeletonPulse}`} />
      </div>
    </div>
  );
}

export function DashboardWelcome() {
  const { status, authorName } = useAuth();
  const { score, isLoading, insufficientData } = useOperationalHealthScore();
  const healthCardRef = useRef<HTMLDivElement>(null);
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
    <div className={headerRowClass}>
      <div className={`${dashboardWelcomeCardClass} min-w-0`}>
        <div className={welcomeLayoutClass}>
          <div className="flex min-w-0 items-center justify-between gap-3 md:contents">
            <div className="cab-dashboard-welcome-logo flex shrink-0 items-center">
              <CabLogo height={36} priority sizes="126px" />
            </div>
            <time
              dateTime={welcomeDate.iso}
              className={welcomeDateClass}
              aria-label={`${welcomeDate.weekday}, ${welcomeDate.day} ${welcomeDate.month} ${welcomeDate.year}`}
            >
              <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cab-text-muted)] md:text-[10px] md:tracking-[0.22em]">
                {welcomeDate.weekday}
              </span>
              <span className="mt-0.5 flex items-baseline justify-end gap-1.5 md:mt-1 md:block">
                <span className="text-xl font-semibold tabular-nums leading-none tracking-tight text-[color:var(--cab-text)] md:text-4xl">
                  {welcomeDate.day}
                </span>
                <span className="text-[11px] leading-snug text-[color:var(--cab-text-muted)] md:mt-0.5 md:block md:text-sm">
                  <span className="capitalize">{welcomeDate.month}</span>
                  <span className="tabular-nums md:mx-1"> {welcomeDate.year}</span>
                </span>
              </span>
            </time>
          </div>
          <div className="cab-dashboard-welcome-copy flex min-w-0 flex-col justify-center">
            <h2 className="text-left text-base font-semibold leading-snug tracking-tight text-[color:var(--cab-text)] sm:text-lg md:text-xl">
              {greeting},{" "}
              <span className="font-bold text-[color:var(--cab-primary)]">{who}</span>
            </h2>
            <p className={`${dsTypoBody} mt-0.5 text-left text-[color:var(--cab-text-muted)]`}>
              Benvenuto nel gestionale officina.
            </p>
          </div>
        </div>
      </div>
      <div ref={healthCardRef} className={dashboardHealthCardClass}>
        <DashboardHealthScoreRing
          score={score}
          isLoading={isLoading}
          insufficientData={insufficientData}
          panelAnchorRef={healthCardRef}
        />
      </div>
    </div>
  );
}
