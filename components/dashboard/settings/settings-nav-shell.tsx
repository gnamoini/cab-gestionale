"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  SETTINGS_NAV_GROUP_LABEL,
  settingsNavBtnClass,
} from "@/components/dashboard/settings-list-ui";
import {
  SETTINGS_NAV_ITEM_COUNT,
  type SettingsNavEntry,
  type SistemaSectionId,
} from "@/components/dashboard/settings/settings-workspace-types";
import { dsFocus, gestionaleSelectFilterClass } from "@/lib/ui/design-system";

export function SettingsMainPanel({
  pageMode,
  className,
  children,
  sectionTitleId,
}: {
  pageMode: boolean;
  className: string;
  children: ReactNode;
  sectionTitleId?: string;
}) {
  if (pageMode) {
    return (
      <main className={className} aria-labelledby={sectionTitleId}>
        {children}
      </main>
    );
  }
  return <GestionaleModalScrollBody className={className}>{children}</GestionaleModalScrollBody>;
}

export function SettingsNavMenuList({
  filteredNav,
  section,
  onPickSection,
  navClassName,
}: {
  filteredNav: SettingsNavEntry[];
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
  navClassName?: string;
}) {
  return (
    <nav
      className={`gestionale-scrollbar space-y-1 overflow-y-auto p-2 ${navClassName ?? "max-h-[min(60vh,22rem)]"}`}
      aria-label="Elenco sezioni configurazione"
    >
      {filteredNav.map((e, i) => {
        if (e.kind === "group") {
          return (
            <p key={`nav-g-${e.label}-${i}`} className={SETTINGS_NAV_GROUP_LABEL}>
              {e.label}
            </p>
          );
        }
        const active = section === e.id;
        return (
          <button
            key={e.id}
            type="button"
            aria-current={active ? "true" : undefined}
            onClick={() => onPickSection(e.id)}
            className={settingsNavBtnClass(active)}
          >
            {e.label}
          </button>
        );
      })}
    </nav>
  );
}

export function SettingsMobileSectionPicker({
  open,
  activeLabel,
  activeGroupLabel,
  onToggle,
  onClose,
  filteredNav,
  section,
  onPickSection,
  navQ,
  setNavQ,
}: {
  open: boolean;
  activeLabel: string;
  activeGroupLabel: string;
  onToggle: () => void;
  onClose: () => void;
  filteredNav: SettingsNavEntry[];
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
  navQ: string;
  setNavQ: (v: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      if (rootRef.current?.contains(ev.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative w-full md:hidden">
      <button
        type="button"
        className={`${gestionaleSelectFilterClass} relative block min-w-0 truncate text-left ${open ? "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]" : ""} ${dsFocus}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="settings-mobile-nav-panel"
        aria-haspopup="listbox"
        aria-label={`Sezione configurazione: ${activeLabel}. Apri elenco (${SETTINGS_NAV_ITEM_COUNT} sezioni).`}
      >
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-[color:var(--cab-text-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="sr-only">Sezione: </span>
        <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          {activeGroupLabel}
        </span>
        <span className="block truncate">{activeLabel}</span>
      </button>

      {open ? (
        <div
          id="settings-mobile-nav-panel"
          role="listbox"
          className="absolute left-0 right-0 top-full z-[var(--ds-z-dropdown,50)] mt-1 overflow-hidden rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-lg"
        >
          <div className="border-b border-[color:var(--cab-border)] p-2">
            <GestionaleSearchField
              value={navQ}
              onChange={(e) => setNavQ(e.target.value)}
              placeholder="Cerca sezione…"
              autoComplete="off"
              aria-label="Cerca nelle sezioni configurazione"
            />
          </div>
          <SettingsNavMenuList
            filteredNav={filteredNav}
            section={section}
            onPickSection={(id) => {
              onPickSection(id);
              onClose();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
