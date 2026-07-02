import type { ReactNode } from "react";

export const sidebarNavLinkBase =
  "cab-sidebar-nav-link group relative grid w-full min-h-10 shrink-0 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-lg px-2.5 text-sm font-medium";

export const sidebarNavLinkInactive =
  "text-zinc-600 hover:bg-zinc-100/95 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/90 dark:hover:text-zinc-100";

export const sidebarNavLinkActive =
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-text))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_22%,transparent)] before:absolute before:left-0 before:top-1/2 before:h-8 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-[color:var(--cab-primary)] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-card))] dark:text-white dark:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_35%,transparent)]";

export const sidebarNavIconShellActive =
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-surface-2))] text-[color:var(--cab-primary)]";

export const sidebarNavIconShellInactive =
  "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200";

export function SidebarNavIconWrap({
  shellClass,
  children,
  dimmed,
  className = "",
}: {
  shellClass: string;
  children: ReactNode;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <span className="cab-sidebar-nav-icon-slot flex h-7 w-7 shrink-0 items-center justify-center">
      <span
        className={`cab-sidebar-nav-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${shellClass} ${
          dimmed ? "opacity-60" : ""
        } ${className}`.trim()}
        aria-hidden
      >
        {children}
      </span>
    </span>
  );
}

/** Chevron colonna 3 — apre pannello a destra (profilo / notifiche). */
export function SidebarSessionExpandChevron({ active = false }: { active?: boolean }) {
  return (
    <svg
      className={`cab-sidebar-session-expand-chevron h-3.5 w-3.5 shrink-0 transition-[opacity,transform,color] duration-200 ease-out ${
        active
          ? "translate-x-0 text-[color:var(--cab-primary)] opacity-100"
          : "text-[color:var(--cab-text-muted)] opacity-55 group-hover:translate-x-0.5 group-hover:opacity-90"
      }`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l4 4-4 4" />
    </svg>
  );
}
