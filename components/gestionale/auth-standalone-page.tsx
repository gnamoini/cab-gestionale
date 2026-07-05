"use client";

import type { ReactNode } from "react";
import { CabLogo, CAB_APP_PRODUCT_NAME } from "@/components/gestionale/cab-logo";
import { ThemeToggle } from "@/components/gestionale/theme-toggle";

const DOT_GRID_STYLE = {
  backgroundImage: "radial-gradient(circle at 1.5px 1.5px, currentColor 1px, transparent 0)",
  backgroundSize: "24px 24px",
} as const;

const LOGIN_DOT_GRID_STYLE = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0), radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)",
  backgroundSize: "32px 32px, 16px 16px",
  backgroundPosition: "0 0, 8px 8px",
} as const;

function AuthStandaloneDefaultDecor() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055]"
        style={DOT_GRID_STYLE}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.04] blur-[1px] dark:opacity-[0.06]"
        aria-hidden
      >
        <CabLogo
          height={240}
          priority={false}
          sizes="(max-width: 768px) 80vw, 240px"
          className="mx-auto object-center dark:brightness-[1.15] dark:contrast-[0.92] dark:saturate-0"
        />
      </div>
    </>
  );
}

/** Sfondo login: gradiente brand, glow morbidi, griglia doppia, watermark centrato. */
function AuthStandaloneLoginDecor() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,color-mix(in_srgb,var(--cab-bg-app)_88%,var(--cab-primary))_0%,var(--cab-bg-app)_42%,color-mix(in_srgb,var(--cab-surface-2)_72%,var(--cab-bg-app))_100%)] dark:bg-[linear-gradient(165deg,color-mix(in_srgb,var(--cab-bg-app)_94%,var(--cab-primary))_0%,var(--cab-bg-app)_38%,color-mix(in_srgb,var(--cab-surface)_88%,var(--cab-bg-app))_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-18%,color-mix(in_srgb,var(--cab-primary)_20%,transparent),transparent_68%)] dark:bg-[radial-gradient(ellipse_90%_55%_at_50%_-18%,color-mix(in_srgb,var(--cab-primary)_14%,transparent),transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_42%_38%_at_100%_100%,color-mix(in_srgb,var(--cab-primary)_12%,transparent),transparent_70%)] dark:bg-[radial-gradient(ellipse_42%_38%_at_100%_100%,color-mix(in_srgb,var(--cab-primary)_9%,transparent),transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_36%_32%_at_0%_88%,color-mix(in_srgb,var(--cab-primary)_8%,transparent),transparent_75%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 text-[color:var(--cab-text)] opacity-[0.05] dark:opacity-[0.08]"
        style={LOGIN_DOT_GRID_STYLE}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 select-none"
        aria-hidden
      >
        <div className="relative opacity-[0.055] blur-[0.5px] dark:opacity-[0.08]">
          <div
            className="absolute left-1/2 top-1/2 h-[min(72vw,22rem)] w-[min(72vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--cab-primary)_22%,transparent)_0%,transparent_70%)]"
            aria-hidden
          />
          <CabLogo
            height={280}
            priority={false}
            sizes="(max-width: 768px) 72vw, 280px"
            className="relative mx-auto object-center dark:brightness-[1.12] dark:contrast-[0.94] dark:saturate-0"
          />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,color-mix(in_srgb,var(--cab-bg-app)_78%,transparent)_100%)] opacity-70 dark:opacity-85"
        aria-hidden
      />
    </>
  );
}

/** Shell full-page condiviso (login, 404 standalone): griglia, watermark logo, theme toggle opzionale. */
export function AuthStandalonePageShell({
  children,
  showThemeToggle = true,
  decorativeBackground = true,
  scrollable = false,
}: {
  children: ReactNode;
  showThemeToggle?: boolean;
  /** false: piatto; true: griglia + watermark (404); "login": sfondo brand arricchito. */
  decorativeBackground?: boolean | "login";
  /** true: contenuto lungo scrollabile (es. privacy policy); false: overflow hidden (login). */
  scrollable?: boolean;
}) {
  const showDecor = decorativeBackground !== false;
  const loginDecor = decorativeBackground === "login";

  return (
    <div
      className={
        scrollable
          ? "relative isolate min-h-dvh overflow-y-auto overscroll-y-contain gestionale-scrollbar bg-[var(--cab-bg-app)]"
          : "relative isolate min-h-dvh overflow-hidden bg-[var(--cab-bg-app)]"
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[var(--cab-bg-app)]" aria-hidden />
      {showDecor ? (loginDecor ? <AuthStandaloneLoginDecor /> : <AuthStandaloneDefaultDecor />) : null}
      {showThemeToggle ? (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** Card centrata login/404: senza `max-w-full` di dsSurfaceCard (altrimenti si allarga a tutta la viewport). */
export const authStandaloneCardClass =
  "mx-auto w-full min-w-0 max-w-[26rem] shrink-0 rounded-[var(--ds-radius-xl)] border border-[color:color-mix(in_srgb,var(--cab-border)_70%,var(--cab-border-strong))] bg-[var(--cab-card)] p-6 shadow-[var(--cab-shadow-md)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-border)_45%,transparent)] sm:p-8";

export function AuthStandaloneCardHeader({
  logoPriority = true,
  srOnlyTitle,
  productLabel = CAB_APP_PRODUCT_NAME,
}: {
  logoPriority?: boolean;
  srOnlyTitle?: string;
  /** Default nome completo; login/privacy usano `AUTH_STANDALONE_LOGO_SUBTITLE`. */
  productLabel?: string;
}) {
  return (
    <header className="mb-7 flex flex-col items-center text-center">
      <CabLogo
        height={56}
        priority={logoPriority}
        className="mx-auto object-center dark:brightness-[1.08] dark:contrast-[0.95]"
      />
      <p className="mt-2 text-xs font-semibold tracking-wide text-[color:var(--cab-text-muted)]">
        {productLabel}
      </p>
      {srOnlyTitle ? <h1 className="sr-only">{srOnlyTitle}</h1> : null}
    </header>
  );
}
