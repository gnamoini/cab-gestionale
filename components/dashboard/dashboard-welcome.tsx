"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { CabLogo, CabLogoFill } from "@/components/gestionale/cab-logo";
import { formatUserDisplayName } from "@/src/lib/auth/resolve-user-display-name";
import { dsSkeletonPulse, dsTypoBody } from "@/lib/ui/design-system";

const welcomeCardClass =
  "relative overflow-hidden rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_5%,var(--cab-card))] px-5 py-5 shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,#fff_7%,transparent)] dark:border-[color:color-mix(in_srgb,var(--cab-primary)_26%,var(--cab-border))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-card))] dark:shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,var(--cab-primary)_14%,transparent)]";

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

/** Logo CAB decorativo in filigrana — sfondo uniforme, senza bande o scrim verticali. */
function WelcomeLogoBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-y-0 right-0 w-[min(62%,16rem)] opacity-[0.07] dark:opacity-[0.045]">
        <CabLogoFill className="object-center" />
      </div>
    </div>
  );
}

function WelcomeSkeleton() {
  return (
    <div className={welcomeCardClass} aria-hidden>
      <WelcomeLogoBackdrop />
      <div className="relative z-[1] grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 sm:flex sm:items-center sm:gap-4">
        <div className={`h-10 w-28 shrink-0 self-center ${dsSkeletonPulse}`} />
        <div className="min-w-0 space-y-2 self-center sm:flex-1">
          <div className={`h-3 w-24 ${dsSkeletonPulse} opacity-60`} />
          <div className={`h-7 w-56 max-w-full ${dsSkeletonPulse}`} />
          <div className={`h-4 w-40 max-w-full ${dsSkeletonPulse} opacity-70`} />
        </div>
        <div className={`col-span-2 h-14 border-t border-[var(--cab-border)] pt-4 sm:col-span-1 sm:h-10 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4 ${dsSkeletonPulse} opacity-50`} />
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
      <WelcomeLogoBackdrop />
      <div className="relative z-[1] grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-4 sm:flex sm:flex-row sm:items-center sm:gap-5">
        <div className="flex shrink-0 items-center self-center py-0.5">
          <CabLogo height={40} priority className="relative z-[1]" />
        </div>
        <div className="min-w-0 self-center sm:flex-1">
          <h2 className="text-xl font-semibold leading-tight tracking-tight text-[color:var(--cab-text)] md:text-2xl">
            {greeting},{" "}
            <span className="font-bold text-[color:var(--cab-primary)]">{who}</span>
          </h2>
          <p className={`${dsTypoBody} mt-1.5 text-[color:var(--cab-text-muted)]`}>
            Benvenuto nel gestionale officina.
          </p>
        </div>
        <time
          dateTime={welcomeDate.iso}
          className="col-span-2 shrink-0 border-t-2 border-[color:color-mix(in_srgb,var(--cab-primary)_50%,transparent)] pt-4 text-left sm:col-span-1 sm:border-t-0 sm:border-l-2 sm:pt-0 sm:pl-5"
          aria-label={`${welcomeDate.weekday}, ${welcomeDate.day} ${welcomeDate.month} ${welcomeDate.year}`}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--cab-text-muted)]">
            {welcomeDate.weekday}
          </span>
          <span className="mt-1.5 block text-3xl font-semibold tabular-nums leading-none tracking-tight text-[color:var(--cab-text)] sm:text-4xl md:text-[2.75rem]">
            {welcomeDate.day}
          </span>
          <span className="mt-1 block text-sm leading-snug text-[color:var(--cab-text-muted)] sm:text-[0.9375rem]">
            <span className="capitalize">{welcomeDate.month}</span>
            <span className="mx-1 tabular-nums">{welcomeDate.year}</span>
          </span>
        </time>
      </div>
    </div>
  );
}
