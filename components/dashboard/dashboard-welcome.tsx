"use client";

import { useMemo } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { CabLogo } from "@/components/gestionale/cab-logo";
import { welcomeFirstName } from "@/src/lib/auth/resolve-user-display-name";

const dashboardWelcomeCardClass =
  "relative flex min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_5%,var(--cab-card))] px-3 py-2 shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,#fff_7%,transparent)] sm:px-4 sm:py-2.5 lg:px-6 lg:py-3.5 dark:border-[color:color-mix(in_srgb,var(--cab-primary)_26%,var(--cab-border))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-card))] dark:shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,var(--cab-primary)_14%,transparent)]";

/** Logo+copy a sinistra; data a destra solo da sm (nascosta su mobile). */
const welcomeLayoutClass =
  "cab-dashboard-welcome-layout flex w-full min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:gap-6";

const welcomeLeadClass =
  "flex min-w-0 items-center gap-2.5 sm:gap-3 lg:gap-4";

const welcomeDateClass =
  "cab-dashboard-welcome-date hidden shrink-0 flex-col justify-center border-l border-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] pl-2.5 text-right sm:flex sm:border-l-2 sm:pl-3 lg:pl-4";

function timeGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Buongiorno";
  if (hour >= 12 && hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function capitalizeIt(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Parti per blocco data in welcome. */
function formatWelcomeDate(d: Date): {
  iso: string;
  day: string;
  weekday: string;
  weekdayShort: string;
  month: string;
  monthShort: string;
  year: string;
} {
  const weekday = capitalizeIt(d.toLocaleDateString("it-IT", { weekday: "long" }));
  const weekdayShort = capitalizeIt(d.toLocaleDateString("it-IT", { weekday: "short" })).replace(/\.$/, "");
  const month = d.toLocaleDateString("it-IT", { month: "long" });
  const monthShort = d.toLocaleDateString("it-IT", { month: "short" }).replace(/\.$/, "");
  const year = d.toLocaleDateString("it-IT", { year: "numeric" });
  const day = d.toLocaleDateString("it-IT", { day: "numeric" });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { iso, day, weekday, weekdayShort, month, monthShort, year };
}

export function DashboardWelcome() {
  const { status, authorName, user } = useAuth();

  const { greeting, who, welcomeDate } = useMemo(() => {
    const now = new Date();
    const w = isAuthSessionEstablished(status)
      ? welcomeFirstName({ givenName: user?.givenName, displayName: authorName.trim() || "Team CAB" })
      : "Team CAB";
    return {
      greeting: timeGreeting(now.getHours()),
      who: w,
      welcomeDate: formatWelcomeDate(now),
    };
  }, [status, authorName, user?.givenName]);

  return (
    <div className={dashboardWelcomeCardClass}>
      <div className={welcomeLayoutClass}>
        <div className={welcomeLeadClass}>
          <div className="cab-dashboard-welcome-logo shrink-0 self-center">
            <CabLogo
              height={36}
              priority
              sizes="(max-width: 1023px) 80px, 104px"
              className="!h-7 !w-auto sm:!h-8 lg:!h-9"
            />
          </div>

          <div className="cab-dashboard-welcome-copy min-w-0">
            <h2
              className="truncate text-sm font-semibold leading-tight tracking-tight text-[color:var(--cab-text)] sm:text-base lg:text-lg lg:tracking-tight"
              suppressHydrationWarning
            >
              {greeting},{" "}
              <span className="font-bold text-[color:var(--cab-primary)]" suppressHydrationWarning>
                {who}
              </span>
            </h2>
            <p className="mt-0.5 text-balance text-[11px] leading-snug text-[color:var(--cab-text-muted)] sm:text-xs lg:mt-1 lg:text-sm">
              Benvenuto nel gestionale officina.
            </p>
          </div>
        </div>

        <time
          dateTime={welcomeDate.iso}
          className={welcomeDateClass}
          aria-label={`${welcomeDate.weekday}, ${welcomeDate.day} ${welcomeDate.month} ${welcomeDate.year}`}
          suppressHydrationWarning
        >
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cab-text-muted)] sm:text-[10px] lg:text-[11px] lg:tracking-[0.16em]">
            <span className="sm:hidden">{welcomeDate.weekdayShort}</span>
            <span className="hidden sm:inline">{welcomeDate.weekday}</span>
          </span>
          <span className="mt-0.5 flex items-baseline justify-end gap-1 leading-none lg:mt-1 lg:gap-1.5">
            <span className="text-base font-bold tabular-nums text-[color:var(--cab-text)] sm:text-lg lg:text-2xl">
              {welcomeDate.day}
            </span>
            <span className="text-[10px] capitalize text-[color:var(--cab-text-muted)] sm:text-[11px] lg:text-xs">
              <span className="hidden lg:inline">{welcomeDate.month}</span>
              <span className="lg:hidden">{welcomeDate.monthShort}</span>
              <span className="tabular-nums"> {welcomeDate.year}</span>
            </span>
          </span>
        </time>
      </div>
    </div>
  );
}
