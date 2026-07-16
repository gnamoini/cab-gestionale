"use client";

import { GlobalAnchoredMenu, OptionalTooltip } from "@/components/ui";
import dynamic from "next/dynamic";
import { createElement, useCallback, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { HubIconDownload, HubIconUpload } from "@/components/design-system/hub-table-action-icons";
import { PageActionIconTemplate } from "@/components/ui/page-action-menu/page-action-menu-icons";
import type { PageActionItem } from "@/components/ui/page-action-menu/page-action-menu-types";
import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ExportMode } from "@/lib/data-import/core/field-schema";
import { labelForImportEntity, routeSlugForEntity } from "@/lib/data-import/import-registry-client";
import { usePermissions } from "@/src/hooks/use-permissions";
import { dsFocus, dsPageToolbarBtn } from "@/lib/ui/design-system";
import {
  globalAutocompleteDropdownPortalPanel,
  globalDropdownPortalEnterClass,
} from "@/lib/ui/global-input";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";
import {
  canExportEntity,
  getEntityCapabilities,
  isImportExcelActive,
  isImportExcelExportOnly,
} from "@/lib/data-import/import-capabilities";
import { canImportEntity, type ImportPermissionContext } from "@/lib/data-import/core/import-permissions";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

const DataImportWizardModal = dynamic(
  () => import("@/components/data-import/data-import-wizard-modal").then((m) => m.DataImportWizardModal),
  { ssr: false },
);

type DataImportExportToolbarProps = {
  entity: ImportEntity;
  module: GestionalePermissionModule;
  exportScope?: Record<string, unknown>;
  onImportCompleted?: () => void;
  showTemplate?: boolean;
  disabled?: boolean;
  /** Import aggiuntivi nello stesso menu (es. listino su magazzino). */
  extraImportEntities?: ImportEntity[];
  /** `drawer`: voci etichettate full-width per menu mobile «Altro». */
  layout?: "inline" | "drawer";
  className?: string;
};

type ToolbarMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  title?: string;
  dividerBefore?: boolean;
  onClick: () => void;
};

const TOOLBAR_MENU_PANEL_CLASS = `${globalAutocompleteDropdownPortalPanel} min-w-[11rem] !p-0 ${globalDropdownPortalEnterClass}`;

const TOOLBAR_MENU_OPTION_BASE =
  "block w-full min-h-9 px-3 py-2 text-left text-sm font-medium text-[color:var(--cab-text)] transition-colors sm:min-h-0 sm:py-1.5 sm:text-xs";

function toolbarMenuOptionClass(active: boolean): string {
  return active
    ? `${TOOLBAR_MENU_OPTION_BASE} bg-[var(--cab-hover)]`
    : `${TOOLBAR_MENU_OPTION_BASE} hover:bg-[var(--cab-hover)]`;
}

async function downloadExport(slug: string, mode: ExportMode, scope?: Record<string, unknown>) {
  const sp = new URLSearchParams({ format: "xlsx", mode });
  if (scope?.archived === true) sp.set("archived", "true");
  if (scope?.archived === false) sp.set("archived", "false");
  const res = await fetch(`/api/export/${slug}?${sp.toString()}`);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Export non riuscito");
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(cd);
  const filename = match?.[1] ?? `export-${slug}-${mode}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function importMenuLabel(entity: ImportEntity): string {
  if (entity === "magazzino_ricambi") return "Importa magazzino";
  if (entity === "listino_ricambi") return "Importa listino";
  return "Import Excel";
}

function importWizardModalTitle(entity: ImportEntity): string {
  if (entity === "magazzino_ricambi") return "Importa da Excel magazzino";
  if (entity === "listino_ricambi") return "Importa da Excel listino";
  return `Importa — ${labelForImportEntity(entity)}`;
}

function ToolbarChevronDown({
  className = "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200",
  open = false,
}: {
  className?: string;
  open?: boolean;
}) {
  return (
    <svg
      className={`${className}${open ? " rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ToolbarSplitButton({
  label,
  icon,
  items,
  menuLabel,
  disabled,
  busy,
}: {
  label: string;
  icon: ReactNode;
  items: ToolbarMenuItem[];
  menuLabel: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  const menuId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const hydrated = useClientHydrated();
  const { restoreFocus } = useDropdownFocusRestore(menuOpen);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    restoreFocus();
  }, [restoreFocus]);

  if (!items.length) return null;

  const inactive = Boolean(disabled || busy);

  const runItem = (item: ToolbarMenuItem) => {
    if (item.disabled) return;
    closeMenu();
    item.onClick();
  };

  return (
    <div ref={shellRef} className="relative shrink-0">
      <button
        type="button"
        className={`${dsPageToolbarBtn} shrink-0 touch-manipulation ${
          menuOpen
            ? "bg-[var(--cab-hover)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-border-strong)_75%,transparent)]"
            : ""
        }`}
        disabled={inactive}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={label}
        onClick={() => {
          if (inactive) return;
          setMenuOpen((open) => !open);
        }}
      >
        {icon}
        <span>{busy ? "…" : label}</span>
        <ToolbarChevronDown open={menuOpen} />
      </button>
      <GlobalAnchoredMenu
        open={menuOpen && hydrated}
        anchorRef={shellRef}
        onClose={closeMenu}
        listbox={false}
        listId={menuId}
        aria-label={menuLabel}
        placement="bottom-end"
        matchAnchorWidth={false}
        panelClassName={TOOLBAR_MENU_PANEL_CLASS}
      >
        {items.map((item) => (
          <li key={item.id} role="presentation">
            {item.dividerBefore ? (
              <div role="separator" className="my-0 h-px w-full bg-[color:var(--cab-border)]" aria-hidden />
            ) : null}
            <OptionalTooltip content={item.title}>
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`${toolbarMenuOptionClass(false)} ${dsFocus} touch-manipulation disabled:cursor-not-allowed disabled:opacity-45`}
                onClick={() => runItem(item)}
              >
                {item.label}
              </button>
            </OptionalTooltip>
          </li>
        ))}
      </GlobalAnchoredMenu>
    </div>
  );
}

export function DataImportExportToolbar({
  entity,
  module,
  exportScope,
  onImportCompleted,
  showTemplate = true,
  disabled = false,
  extraImportEntities,
  layout = "inline",
  className = "",
}: DataImportExportToolbarProps) {
  const perm = usePermissions(module);
  const toast = useGestionaleToast();
  const [exporting, setExporting] = useState(false);
  const [wizardEntity, setWizardEntity] = useState<ImportEntity | null>(null);
  const slug = routeSlugForEntity(entity);

  const permissionCtx: ImportPermissionContext = useMemo(
    () => ({
      moduleWrite: { [module]: perm.canWrite },
      magazzinoWrite: module === "magazzino" ? perm.canWrite : false,
      magazzinoAdmin: false,
      manageSettings: false,
    }),
    [module, perm.canWrite],
  );

  const importEntities = useMemo(() => {
    const ids = [entity, ...(extraImportEntities ?? [])];
    return [...new Set(ids)];
  }, [entity, extraImportEntities]);

  const runExport = useCallback(
    async (mode: ExportMode) => {
      if (!perm.canWrite || exporting || disabled) return;
      setExporting(true);
      try {
        await downloadExport(slug, mode, exportScope);
        toast.success(mode === "template" ? "Template scaricato." : "Export completato.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Export non riuscito");
      } finally {
        setExporting(false);
      }
    },
    [disabled, exportScope, exporting, perm.canWrite, slug, toast],
  );

  const importMenuItems = useMemo(() => {
    const items: ToolbarMenuItem[] = [];
    if (showTemplate && canExportEntity(entity)) {
      items.push({
        id: "template",
        label: "Scarica template",
        onClick: () => void runExport("template"),
      });
    }
    const hasTemplate = items.length > 0;
    for (const importEntity of importEntities) {
      if (!canImportEntity(permissionCtx, importEntity)) continue;
      if (isImportExcelActive(importEntity)) {
        items.push({
          id: `import-${importEntity}`,
          label: importMenuLabel(importEntity),
          dividerBefore: hasTemplate && !items.some((i) => i.id.startsWith("import-")),
          onClick: () => setWizardEntity(importEntity),
        });
      } else if (isImportExcelExportOnly(importEntity)) {
        const cap = getEntityCapabilities(importEntity);
        items.push({
          id: `import-roadmap-${importEntity}`,
          label: "Import Excel",
          disabled: true,
          title: cap.note ?? "Import Excel disponibile in una versione successiva.",
          dividerBefore: hasTemplate && !items.some((i) => i.id.startsWith("import-")),
          onClick: () => {},
        });
      }
    }
    return items;
  }, [entity, importEntities, permissionCtx, runExport, showTemplate]);

  const canExport = canExportEntity(entity);

  if (!perm.canWrite || !canExport) return null;
  if (!importMenuItems.length && !canExport) return null;

  if (layout === "drawer") {
    return (
      <>
        <div className={`flex w-full flex-col gap-2 ${className}`.trim()}>
          {importMenuItems.map((item) => (
            <OptionalTooltip key={item.id} content={item.title}>
              <button
                type="button"
                disabled={item.disabled || disabled}
                className={`${dsPageToolbarBtn} w-full justify-start ${dsFocus} disabled:cursor-not-allowed disabled:opacity-45`}
                onClick={() => {
                  if (item.disabled || disabled) return;
                  item.onClick();
                }}
              >
                <HubIconDownload className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            </OptionalTooltip>
          ))}
          {canExport ? (
            <button
              type="button"
              className={`${dsPageToolbarBtn} w-full justify-start ${dsFocus}`}
              disabled={disabled || exporting}
              aria-label="Esporta"
              onClick={() => void runExport("importable")}
            >
              <HubIconUpload className="h-4 w-4 shrink-0" />
              <span>{exporting ? "Esportazione…" : "Esporta"}</span>
            </button>
          ) : null}
        </div>
        {wizardEntity ? (
          <DataImportWizardModal
            entity={wizardEntity}
            title={importWizardModalTitle(wizardEntity)}
            onRequestClose={() => setWizardEntity(null)}
            onCompleted={() => {
              onImportCompleted?.();
              setWizardEntity(null);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarSplitButton
          label="Importa"
          icon={<HubIconDownload className="h-4 w-4 shrink-0" />}
          items={importMenuItems}
          menuLabel="Opzioni importazione"
          disabled={disabled}
        />
        <button
          type="button"
          className={`${dsPageToolbarBtn} shrink-0`}
          disabled={disabled || exporting}
          aria-label="Esporta"
          onClick={() => void runExport("importable")}
        >
          <HubIconUpload className="h-4 w-4 shrink-0" />
          <span>{exporting ? "Esportazione…" : "Esporta"}</span>
        </button>
      </div>
      {wizardEntity ? (
        <DataImportWizardModal
          entity={wizardEntity}
          title={importWizardModalTitle(wizardEntity)}
          onRequestClose={() => setWizardEntity(null)}
          onCompleted={() => {
            onImportCompleted?.();
            setWizardEntity(null);
          }}
        />
      ) : null}
    </>
  );
}

/** Voci flat per `PageActionMenu` (import/export senza sottomenu). */
export function useDataImportExportPageActions({
  entity,
  module,
  exportScope,
  onImportCompleted,
  showTemplate = true,
  disabled = false,
  extraImportEntities,
}: Omit<DataImportExportToolbarProps, "layout" | "className">): {
  items: PageActionItem[];
  modal: ReactNode;
} {
  const perm = usePermissions(module);
  const toast = useGestionaleToast();
  const [exporting, setExporting] = useState(false);
  const [wizardEntity, setWizardEntity] = useState<ImportEntity | null>(null);
  const slug = routeSlugForEntity(entity);

  const permissionCtx: ImportPermissionContext = useMemo(
    () => ({
      moduleWrite: { [module]: perm.canWrite },
      magazzinoWrite: module === "magazzino" ? perm.canWrite : false,
      magazzinoAdmin: false,
      manageSettings: false,
    }),
    [module, perm.canWrite],
  );

  const importEntities = useMemo(() => {
    const ids = [entity, ...(extraImportEntities ?? [])];
    return [...new Set(ids)];
  }, [entity, extraImportEntities]);

  const runExport = useCallback(
    async (mode: ExportMode) => {
      if (!perm.canWrite || exporting || disabled) return;
      setExporting(true);
      try {
        await downloadExport(slug, mode, exportScope);
        toast.success(mode === "template" ? "Template scaricato." : "Export completato.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Export non riuscito");
      } finally {
        setExporting(false);
      }
    },
    [disabled, exportScope, exporting, perm.canWrite, slug, toast],
  );

  const importMenuItems = useMemo(() => {
    const items: ToolbarMenuItem[] = [];
    if (showTemplate && canExportEntity(entity)) {
      items.push({
        id: "template",
        label: "Scarica template",
        onClick: () => void runExport("template"),
      });
    }
    const hasTemplate = items.length > 0;
    for (const importEntity of importEntities) {
      if (!canImportEntity(permissionCtx, importEntity)) continue;
      if (isImportExcelActive(importEntity)) {
        items.push({
          id: `import-${importEntity}`,
          label: importMenuLabel(importEntity),
          dividerBefore: hasTemplate && !items.some((i) => i.id.startsWith("import-")),
          onClick: () => setWizardEntity(importEntity),
        });
      } else if (isImportExcelExportOnly(importEntity)) {
        const cap = getEntityCapabilities(importEntity);
        items.push({
          id: `import-roadmap-${importEntity}`,
          label: "Import Excel",
          disabled: true,
          title: cap.note ?? "Import Excel disponibile in una versione successiva.",
          dividerBefore: hasTemplate && !items.some((i) => i.id.startsWith("import-")),
          onClick: () => {},
        });
      }
    }
    return items;
  }, [entity, importEntities, permissionCtx, runExport, showTemplate]);

  const canExport = canExportEntity(entity);

  const items = useMemo((): PageActionItem[] => {
    if (!perm.canWrite || !canExport) return [];
    const out: PageActionItem[] = [];
    for (const menuItem of importMenuItems) {
      out.push({
        id: menuItem.id,
        label: menuItem.label,
        description:
          menuItem.title ??
          (menuItem.id === "template"
            ? "Modello Excel vuoto da compilare"
            : menuItem.id.startsWith("import-")
              ? "Carica dati da file Excel"
              : undefined),
        disabled: menuItem.disabled || disabled,
        disabledReason: menuItem.title,
        onSelect: menuItem.onClick,
        icon:
          menuItem.id === "template"
            ? createElement(PageActionIconTemplate)
            : createElement(HubIconDownload, { className: "h-4 w-4 shrink-0" }),
        module,
        requireWrite: true,
      });
    }
    if (canExport) {
      out.push({
        id: "export-importable",
        label: exporting ? "Esportazione…" : "Esporta",
        description: "Scarica Excel del magazzino",
        onSelect: () => void runExport("importable"),
        disabled: disabled || exporting,
        loading: exporting,
        icon: createElement(HubIconUpload, { className: "h-4 w-4 shrink-0" }),
        module,
        requireWrite: true,
      });
    }
    return out;
  }, [canExport, disabled, exporting, importMenuItems, module, perm.canWrite, runExport]);

  const modal =
    wizardEntity != null ? (
      <DataImportWizardModal
        entity={wizardEntity}
        title={importWizardModalTitle(wizardEntity)}
        onRequestClose={() => setWizardEntity(null)}
        onCompleted={() => {
          onImportCompleted?.();
          setWizardEntity(null);
        }}
      />
    ) : null;

  return { items, modal };
}
