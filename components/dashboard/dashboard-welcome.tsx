"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { CabLogo, CAB_LOGO_PATH } from "@/components/gestionale/cab-logo";
import { formatUserDisplayName } from "@/src/lib/auth/resolve-user-display-name";
import { dsSkeletonPulse, dsTypoBody } from "@/lib/ui/design-system";

const welcomeCardClass =
  "relative overflow-hidden rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[var(--cab-card)] px-5 py-5 shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,#fff_7%,transparent)] dark:border-[color:color-mix(in_srgb,var(--cab-primary)_26%,var(--cab-border))] dark:shadow-[var(--cab-shadow-md),inset_0_1px_0_0_color-mix(in_srgb,var(--cab-primary)_14%,transparent)]";

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

/** Logo CAB decorativo: grande, sfocato, bassa opacità — non interferisce col testo. */
function WelcomeLogoBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--cab-card)] via-[color:color-mix(in_srgb,var(--cab-card)_97%,var(--cab-primary))] to-[color:color-mix(in_srgb,var(--cab-primary)_11%,var(--cab-surface-2))]" />

      <div className="absolute right-[14%] top-1/2 h-[11rem] w-[min(52vw,18rem)] -translate-y-1/2 sm:right-[22%] sm:h-[12.5rem] sm:w-[20rem] md:right-[28%] md:h-[14rem] md:w-[22rem]">
        <div className="relative h-full w-full opacity-[0.07] blur-[3px] saturate-[1.15] dark:opacity-[0.05] dark:blur-[4px]">
          <Image src={CAB_LOGO_PATH} alt="" fill sizes="(max-width: 640px) 240px, 352px" className="object-contain object-center" />
        </div>
      </div>

      <div className="absolute inset-y-0 left-0 w-[min(100%,72%)] bg-gradient-to-r from-[var(--cab-card)] via-[color:color-mix(in_srgb,var(--cab-card)_88%,transparent)] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[color:color-mix(in_srgb,var(--cab-card)_40%,transparent)] via-transparent to-transparent" />

      <div
        className="absolute right-[12%] top-0 h-28 w-28 rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,transparent)] blur-3xl sm:right-[18%] md:right-[24%]"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-1/3 h-20 w-32 rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,transparent)] blur-2xl"
        aria-hidden
      />
    </div>
  );
}

function WelcomeSkeleton() {
  return (
    <div className={welcomeCardClass} aria-hidden>
      <WelcomeLogoBackdrop />
      <div className="relative z-[1] flex items-center gap-4">
        <div className={`h-10 w-28 shrink-0 ${dsSkeletonPulse}`} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className={`h-3 w-24 ${dsSkeletonPulse} opacity-60`} />
          <div className={`h-7 w-56 max-w-full ${dsSkeletonPulse}`} />
          <div className={`h-4 w-40 max-w-full ${dsSkeletonPulse} opacity-70`} />
        </div>
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
      <div className="relative z-[1] flex flex-wrap items-center gap-4 sm:gap-5">
        <div className="flex shrink-0 items-center py-0.5">
          <CabLogo
            height={40}
            priority
            className="drop-shadow-[0_2px_14px_color-mix(in_srgb,var(--cab-primary)_40%,transparent)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold leading-tight tracking-tight text-[color:var(--cab-text)] md:text-2xl">
            {greeting},{" "}
            <span className="font-bold bg-gradient-to-r from-[color:var(--cab-primary)] to-[color:color-mix(in_srgb,var(--cab-primary)_65%,var(--cab-text))] bg-clip-text text-transparent">
              {who}
            </span>
          </h2>
          <p className={`${dsTypoBody} mt-1.5 text-[color:var(--cab-text-muted)]`}>
            Benvenuto nel gestionale officina.
          </p>
        </div>
        <time
          dateTime={welcomeDate.iso}
          className="relative shrink-0 border-l-2 border-[color:color-mix(in_srgb,var(--cab-primary)_50%,transparent)] pl-4 text-left sm:pl-5"
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
