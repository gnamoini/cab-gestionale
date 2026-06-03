"use client";

import type { ReactNode } from "react";
import { CabLogo, CAB_APP_PRODUCT_NAME } from "@/components/gestionale/cab-logo";
import { ThemeToggle } from "@/components/gestionale/theme-toggle";

const DOT_GRID_STYLE = {
  backgroundImage: "radial-gradient(circle at 1.5px 1.5px, currentColor 1px, transparent 0)",
  backgroundSize: "24px 24px",
} as const;

/** Shell full-page condiviso (login, 404 standalone): griglia, watermark logo, theme toggle opzionale. */
export function AuthStandalonePageShell({
  children,
  showThemeToggle = true,
}: {
  children: ReactNode;
  showThemeToggle?: boolean;
}) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[var(--cab-bg-app)]">
      <div className="pointer-events-none absolute inset-0 bg-[var(--cab-bg-app)]" aria-hidden />
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
}: {
  logoPriority?: boolean;
  srOnlyTitle?: string;
}) {
  return (
    <header className="mb-7 flex flex-col items-center text-center">
      <CabLogo
        height={56}
        priority={logoPriority}
        className="mx-auto object-center dark:brightness-[1.08] dark:contrast-[0.95]"
      />
      <p className="mt-2 text-xs font-semibold tracking-wide text-[color:var(--cab-text-muted)]">
        {CAB_APP_PRODUCT_NAME}
      </p>
      {srOnlyTitle ? <h1 className="sr-only">{srOnlyTitle}</h1> : null}
    </header>
  );
}
