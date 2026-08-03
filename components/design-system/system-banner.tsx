"use client";

import type { ReactNode } from "react";
import {
  dsSystemBannerActions,
  dsSystemBannerAside,
  dsSystemBannerChip,
  dsSystemBannerContent,
  dsSystemBannerDescription,
  dsSystemBannerInner,
  dsSystemBannerLayout,
  dsSystemBannerLead,
  dsSystemBannerShell,
  dsSystemBannerShellTop,
  dsSystemBannerShellInShell,
  dsSystemBannerTitle,
  dsSystemBannerDismissBtn,
} from "@/lib/ui/design-system";

function SystemBannerDismissIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}

export function SystemBannerShell({
  ariaLabel,
  role = "region",
  placement = "global",
  children,
}: {
  ariaLabel: string;
  role?: "region" | "status";
  /** global = fuori AppShell (PWA); inShell = dentro main.gestionale-scroll-y */
  placement?: "global" | "inShell";
  children: ReactNode;
}) {
  const positionClass = placement === "inShell" ? dsSystemBannerShellInShell : dsSystemBannerShellTop;

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-live={role === "status" ? "polite" : undefined}
      className={`${dsSystemBannerShell} ${positionClass}`}
    >
      <div className={dsSystemBannerInner}>{children}</div>
    </div>
  );
}

export function SystemBannerDismiss({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-label={label} className={dsSystemBannerDismissBtn} onClick={onClick}>
      <SystemBannerDismissIcon />
    </button>
  );
}

export function SystemBannerChips({ items, ariaLabel }: { items: readonly string[]; ariaLabel: string }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item} className={dsSystemBannerChip}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function SystemBannerLayout({
  media,
  title,
  titleExtra,
  description,
  tags,
  tagsAriaLabel,
  children,
  actions,
  onDismiss,
  dismissLabel,
}: {
  media?: ReactNode;
  title: ReactNode;
  titleExtra?: ReactNode;
  description?: ReactNode;
  tags?: readonly string[];
  tagsAriaLabel?: string;
  children?: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  const hasAside = Boolean(actions || onDismiss);

  return (
    <div className={dsSystemBannerLayout}>
      <div className={dsSystemBannerLead}>
        {media ? <div className="shrink-0">{media}</div> : null}

        <div className={dsSystemBannerContent}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className={dsSystemBannerTitle}>{title}</p>
            {titleExtra}
          </div>
          {description ? <p className={dsSystemBannerDescription}>{description}</p> : null}
          {tags && tagsAriaLabel ? <SystemBannerChips items={tags} ariaLabel={tagsAriaLabel} /> : null}
          {children}
        </div>
      </div>

      {hasAside ? (
        <div className={dsSystemBannerAside}>
          {onDismiss ? <SystemBannerDismiss label={dismissLabel ?? "Chiudi"} onClick={onDismiss} /> : null}
          {actions ? <div className={dsSystemBannerActions}>{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
