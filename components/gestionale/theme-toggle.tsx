"use client";

import { OptionalTooltip } from "@/components/ui";
import { resolveTooltipContent } from "@/lib/ui/tooltip-value-score";
import { useTheme } from "@/context/theme-context";
import { suppressSidebarBlurCollapse } from "@/lib/ui/use-sidebar-collapsed";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";
import { dsBtnGhost, dsFocus, dsPageToolbarBtn } from "@/lib/ui/design-system";

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="4" strokeLinecap="round" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}

/** Icona stato tema corrente (sole = chiaro, luna = scuro) per sidebar e label. */
export function ThemeModeIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  const { resolved, themeReady } = useTheme();
  const mounted = useClientHydrated();

  if (!mounted || !themeReady) {
    return <span className={`inline-block rounded-full bg-zinc-300/80 dark:bg-zinc-600/80 ${className}`} aria-hidden />;
  }

  return resolved === "dark" ? (
    <IconMoon className={className} />
  ) : (
    <IconSun className={className} />
  );
}

export function ThemeToggle({
  variant = "button",
}: {
  variant?: "button" | "switch" | "ghost";
}) {
  const { resolved, themeReady, themeSaving, toggleLightDark } = useTheme();
  const mounted = useClientHydrated();

  const label = resolved === "dark" ? "Passa a tema chiaro" : "Passa a tema scuro";
  const tip = resolveTooltipContent("", themeSaving ? "Salvataggio…" : label, {
    iconOnly: true,
    ariaLabel: label,
  });

  const handleToggle = () => {
    suppressSidebarBlurCollapse(480);
    toggleLightDark();
  };

  if (!mounted || !themeReady) {
    const ghostPlaceholder = variant === "ghost" ? "h-[1.75rem] min-w-[4.5rem] rounded-[var(--ds-radius-lg)]" : "";
    return (
      <span
        className={`inline-flex min-w-0 shrink-0 items-center justify-center border border-transparent bg-transparent ${
          variant === "switch"
            ? "h-6 w-10 rounded-full"
            : variant === "ghost"
              ? ghostPlaceholder
              : "h-11 min-w-[2.75rem] rounded-lg"
        }`}
        aria-hidden
      />
    );
  }

  if (variant === "ghost") {
    const shortLabel = resolved === "dark" ? "Chiaro" : "Scuro";
    return (
      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation();
          suppressSidebarBlurCollapse(480);
        }}
        onClick={handleToggle}
        disabled={themeSaving}
        className={`${dsBtnGhost} ${dsFocus} inline-flex min-h-[1.75rem] items-center gap-1.5 px-2 py-1 text-[10px] sm:text-xs disabled:opacity-60`}
        aria-label={label}
        aria-busy={themeSaving}
      >
        <ThemeModeIcon className="h-3.5 w-3.5" />
        {themeSaving ? "Salvataggio…" : shortLabel}
      </button>
    );
  }

  if (variant === "switch") {
    const checked = resolved === "dark";
    return (
      <OptionalTooltip content={tip} showOnFocus={false}>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onPointerDown={(event) => {
            event.stopPropagation();
            suppressSidebarBlurCollapse(480);
          }}
          onClick={handleToggle}
          disabled={themeSaving}
          className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${dsFocus} ${
            themeSaving ? "cursor-not-allowed opacity-55" : "cursor-pointer"
          } ${checked ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_85%,var(--cab-surface))]" : "bg-zinc-300 dark:bg-zinc-600"}`}
          aria-label={label}
          aria-busy={themeSaving}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
              checked ? "translate-x-[1.125rem]" : "translate-x-1"
            }`}
            aria-hidden
          />
        </button>
      </OptionalTooltip>
    );
  }

  return (
    <OptionalTooltip content={tip} showOnFocus={false}>
      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation();
          suppressSidebarBlurCollapse(480);
        }}
        onClick={handleToggle}
        disabled={themeSaving}
        className={`${dsPageToolbarBtn} h-11 min-w-[2.75rem] px-2.5 sm:px-3 disabled:opacity-60`}
        aria-label={label}
        aria-busy={themeSaving}
      >
        {resolved === "dark" ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
      </button>
    </OptionalTooltip>
  );
}
