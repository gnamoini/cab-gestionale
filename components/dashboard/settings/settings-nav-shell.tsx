"use client";

import { useEffect, useMemo, useRef, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import {
  SETTINGS_NAV_BTN_LABEL,
  SETTINGS_NAV_GROUP_LABEL,
  SETTINGS_SIDEBAR_NAV,
  SETTINGS_SIDEBAR_NAV_PAGE_PAD,
  SETTINGS_SIDEBAR_OVERVIEW,
  settingsNavBtnClass,
  settingsNavIconWrapClass,
  settingsNavOverviewBtnClass,
} from "@/components/dashboard/settings-list-ui";
import { SettingsSectionIcon } from "@/components/dashboard/settings/settings-section-icons";
import {
  SETTINGS_NAV_ITEM_COUNT,
  SETTINGS_NAV_OVERVIEW_ID,
  settingsNavGroupedItems,
  type SistemaSectionId,
} from "@/components/dashboard/settings/settings-workspace-types";
import { dsFocus, gestionaleSelectFilterClass } from "@/lib/ui/design-system";
import { globalInputDropdownPortalPanel } from "@/lib/ui/global-input";

function SettingsNavItemButton({
  sectionId,
  label,
  active,
  onClick,
  buttonRef,
}: {
  sectionId: SistemaSectionId;
  label: string;
  active: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const btnClass = sectionId === SETTINGS_NAV_OVERVIEW_ID ? settingsNavOverviewBtnClass(active) : settingsNavBtnClass(active);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={btnClass}
    >
      <span className={settingsNavIconWrapClass(active)} aria-hidden>
        <SettingsSectionIcon sectionId={sectionId} className="h-4 w-4" />
      </span>
      <span className={SETTINGS_NAV_BTN_LABEL}>{label}</span>
    </button>
  );
}

export function SettingsNavOverviewLink({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <SettingsNavItemButton
      sectionId={SETTINGS_NAV_OVERVIEW_ID}
      label="Panoramica"
      active={active}
      onClick={onClick}
    />
  );
}

export function SettingsNavSidebar({
  section,
  onPickSection,
  variant = "default",
}: {
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
  variant?: "default" | "page";
}) {
  return (
    <div className={variant === "page" ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "contents"}>
      <div className={SETTINGS_SIDEBAR_OVERVIEW}>
        <SettingsNavOverviewLink
          active={section === SETTINGS_NAV_OVERVIEW_ID}
          onClick={() => onPickSection(SETTINGS_NAV_OVERVIEW_ID)}
        />
      </div>
      <SettingsNavMenuList section={section} onPickSection={onPickSection} variant={variant} />
    </div>
  );
}

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
  section,
  onPickSection,
  navClassName,
  scrollable = true,
  variant = "default",
}: {
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
  navClassName?: string;
  scrollable?: boolean;
  /** page = menu sidebar pagina (flex-1, scroll isolato); default = dropdown/modal con max-height. */
  variant?: "default" | "page";
}) {
  const groups = useMemo(() => settingsNavGroupedItems(), []);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [section]);

  const scrollClass = scrollable
    ? variant === "page"
      ? `${SETTINGS_SIDEBAR_NAV} ${navClassName ?? ""}`.trim()
      : `gestionale-scrollbar overflow-y-auto ${navClassName ?? "max-h-[min(60vh,22rem)]"}`
    : `overflow-visible ${navClassName ?? ""}`.trim();

  const navPadClass = variant === "page" ? SETTINGS_SIDEBAR_NAV_PAGE_PAD : "px-2 pb-4 pt-1.5";

  return (
    <nav className={`flex flex-col gap-0.5 ${navPadClass} ${scrollClass}`} aria-label="Elenco sezioni configurazione">
      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`settings-nav-${group.label}`} className="min-w-0">
          <h3 id={`settings-nav-${group.label}`} className={SETTINGS_NAV_GROUP_LABEL}>
            {group.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = section === item.id;
              return (
                <li key={item.id}>
                  <SettingsNavItemButton
                    buttonRef={active ? activeItemRef : undefined}
                    sectionId={item.id}
                    label={item.label}
                    active={active}
                    onClick={() => onPickSection(item.id)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

export function SettingsMobileSectionPicker({
  open,
  activeLabel,
  activeGroupLabel,
  onToggle,
  onClose,
  section,
  onPickSection,
}: {
  open: boolean;
  activeLabel: string;
  activeGroupLabel: string;
  onToggle: () => void;
  onClose: () => void;
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open,
    anchorRef,
    contentRef: panelRef,
    repositionDeps: [open, section],
    maxHeight: 420,
  });

  useDropdownOutsideDismiss(open, anchorRef, panelRef, onClose);

  const panel =
    open && portalStyle ? (
      <div
        ref={panelRef}
        id="settings-mobile-nav-panel"
        role="listbox"
        style={portalStyle}
        className={`${globalInputDropdownPortalPanel} overflow-hidden ${placementOriginClass} ${
          scrollInside ? "overflow-y-auto" : ""
        }`}
      >
        <SettingsNavSidebar
          section={section}
          onPickSection={(id) => {
            onPickSection(id);
            onClose();
          }}
        />
      </div>
    ) : null;

  return (
    <div ref={anchorRef} className="relative w-full md:hidden">
      <button
        type="button"
        className={`${gestionaleSelectFilterClass} relative block min-w-0 truncate text-left ${open ? "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]" : ""} ${dsFocus}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="settings-mobile-nav-panel"
        aria-haspopup="listbox"
        aria-label={`Sezione configurazione: ${activeLabel}. Apri elenco (${SETTINGS_NAV_ITEM_COUNT} sezioni).`}
      >
        <span
          className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${settingsNavIconWrapClass(false)}`}
          aria-hidden
        >
          <SettingsSectionIcon sectionId={section} className="h-3.5 w-3.5" />
        </span>
        <span className="sr-only">Sezione: </span>
        <span className="block truncate pl-8 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          {activeGroupLabel}
        </span>
        <span className="block truncate pl-8">{activeLabel}</span>
      </button>

      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
