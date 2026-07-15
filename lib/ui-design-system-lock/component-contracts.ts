/**
 * Design System Lock — contratti UI obbligatori (SSOT).
 */

import {
  FLEX_CONTAINMENT_MARKERS,
  FLEX_OVERFLOW_CLASS_TOKENS,
  flexSafeRow,
} from "@/lib/ui/global-flex-system";
import { dsPageToolbar } from "@/lib/ui/design-system";
import { globalTableThCell } from "@/lib/ui/global-table";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

export const DS_LOCK_MESSAGE_PREFIX = "[design-system-lock]";

/** Bump minor = nuove regole WARN; bump major = nuove regole BLOCKER */
export const UI_CONTRACT_VERSION = "1.0.0";

/** Versioni per-primitive — bump isolato, non invalida l'intero sistema */
export const UI_PRIMITIVE_VERSIONS = {
  Tooltip: "2.0.0",
  TooltipList: "1.0.0",
  TooltipStatus: "1.0.0",
  GlobalAnchoredMenu: "1.0.0",
  PageActionMenu: "1.0.0",
  GestionaleListTable: "3.0.0",
} as const;

export const UI_CONTRACT_META = {
  ownerTeam: "frontend-platform",
  ownerCategory: "Design System",
  reviewerRequired: true,
  adrRequiredForChange: true,
  adrPath: "docs/adr/",
} as const;

export const TOOLTIP_CONTRACT = {
  ...UI_CONTRACT_META,
  contractVersion: UI_CONTRACT_VERSION,
  primitiveVersion: UI_PRIMITIVE_VERSIONS.Tooltip,
  category: "Tooltip",
  canonical: [
    "Tooltip",
    "TruncatedTextTooltip",
    "DisabledElementTooltip",
    "OptionalTooltip",
    "TooltipList",
    "TooltipStatus",
  ],
  forbiddenImports: ["@radix-ui/react-tooltip", "@/components/design-system/tooltip"],
  consumerImportPath: "@/components/ui",
  forbiddenPatterns: {
    fail: ["createPortal.*dsTooltipContent"],
    warnThenFail: [
      "group-hover:.*opacity",
      "peer-hover:.*opacity",
      "tooltip-content",
      "tooltip-wrapper",
    ],
  },
  tokenOnly: ["dsTooltipContent", "dsTooltipContentMultiline", "dsZTooltip"],
} as const;

export const LIST_CONTRACT = {
  ...UI_CONTRACT_META,
  contractVersion: UI_CONTRACT_VERSION,
  category: "Lists",
  tableLane: ["GestionaleListTable", "gestionaleListTableTd"],
  settingsLane: ["SettingsListSection", "LIST_DIVIDER_UL", "LIST_ROW_SHELL"],
  dropdownLane: ["GlobalSelect", "GlobalAnchoredMenu", "globalInputDropdownOptionClass"],
  forbiddenInline: ["divide-y divide-[color:var(--cab-border)]"],
  newCaseRequiresAdr: true,
} as const;

export const MENU_CONTRACT = {
  ...UI_CONTRACT_META,
  contractVersion: UI_CONTRACT_VERSION,
  primitiveVersion: UI_PRIMITIVE_VERSIONS.GlobalAnchoredMenu,
  category: "Overlay",
  canonical: ["GlobalAnchoredMenu", "GlobalSelect", "PageActionMenu"],
  forbiddenLocalMenus: true,
  consumerImportPath: "@/components/ui",
} as const;

export const PAGE_ACTION_MENU_CONTRACT = {
  ...UI_CONTRACT_META,
  contractVersion: UI_CONTRACT_VERSION,
  primitiveVersion: UI_PRIMITIVE_VERSIONS.PageActionMenu,
  category: "Navigation",
  canonical: [
    "PageActionMenu",
    "PageActionMenuItem",
    "PageActionMenuProvider",
    "usePageActionMenu",
  ],
  consumerImportPath: "@/components/ui",
  forbiddenPatterns: {
    fail: ["ToolbarGroupOverflowToggle.*PageHeader", "GestionalePageToolbarActions"],
  },
} as const;

/** Path substrings allowed to import design-system tooltip directly */
export const UI_DS_IMPORT_ALLOWLIST = [
  "components/ui/",
  "components/design-system/",
  "lib/ui/",
  "lib/regression/",
  "lib/lint/",
  "e2e/",
  "scripts/",
] as const;

/** Gap Tailwind ammessi su toolbar rows (6px, 8px, 10px). */
export const TOOLBAR_ALLOWED_GAPS = ["gap-1.5", "gap-2", "gap-2.5", "gap-3"] as const;

export const TOOLBAR_CONTRACT = {
  shellTokens: ["dsPageToolbar", "ToolbarGroup", "PageToolbar"],
  rowToken: flexSafeRow,
  searchRequired: ["min-w-0", "flex-1", "flex-fill", "flex-fill-safe"],
  actionsRequired: ["shrink-0", "flex-shrink-0", "flex-shrink-safe"],
  allowedGaps: TOOLBAR_ALLOWED_GAPS,
  forbidden: ["dsStickyToolbar", "sticky top-", "fixed top-"],
  canonicalShell: dsPageToolbar,
} as const;

export const TABLE_CONTRACT = {
  shellComponents: ["GestionaleListTable", "GlobalTable"],
  headComponents: ["GlobalTableSortTh", "GlobalTableHeadLabel", "GlobalTableHead"],
  forbiddenTokens: [
    "prevTableTd",
    "dsTableHead",
    "dsTableHeadCell",
    "dsTableSortTh",
    "dsTableThSticky",
    "globalTableWrapInset",
  ],
  canonicalTd: gestionaleListTableTd,
  canonicalTh: globalTableThCell,
  forbiddenTableClasses: ["text-sm"],
} as const;

export const MODAL_CONTRACT = {
  shellComponents: ["Modal", "LavorazioniModalShell", "GestionaleModalShell"],
  panelTokens: ["dsModalPanel", "dsLavorazioniModalDialog"],
  bodyTokens: ["layoutModalBodySafe", "gestionaleModalBodyFlexClass"],
  footerJustify: ["justify-end", "justify-between"],
  headerPadding: ["py-3", "px-4"],
  bodyPadding: ["p-4"],
} as const;

export const FLEX_CONTRACT = {
  containmentMarkers: [...FLEX_CONTAINMENT_MARKERS],
  overflowAllowlistTokens: [...FLEX_OVERFLOW_CLASS_TOKENS],
  flexWrapAllowlistSubstrings: [
    "sm:flex-wrap",
    "md:flex-wrap",
    "lg:flex-wrap",
    "xl:flex-wrap",
    "flex-col",
    "lavorazioni-kanban",
    "recharts",
    "ReportKpiGrid",
    "dashboard-widget",
    "hub-modal-tab-bar",
    "dsHubModalTabBar",
    "cab-page-header-top-row",
  ],
} as const;

/** Allowlist file path substrings — kanban, chart, report, editor modals. */
export const DS_LOCK_FILE_ALLOWLIST = [
  "global-table",
  "gestionale-list-table.css",
  "lavorazioni-scroll.css",
  "lavorazioni-kanban-view",
  "app-shell.tsx",
  "supabase-configuration-banner",
  "preventivi-editor-modal",
  "sistema-impostazioni-modal",
  "report-magazzino-section",
  "components/report/",
  "recharts",
] as const;

/** Allowlist class tokens — skip validation. */
export const DS_LOCK_CLASS_ALLOWLIST = [
  ...FLEX_OVERFLOW_CLASS_TOKENS,
  "dsSurfaceCard",
  "dsSurfaceInteractiveKpi",
  "lavorazioni-kanban",
  "recharts",
  "ReportKpiGrid",
  "globalTableWrap",
  "hub-modal-tab-bar",
  "dsHubModalTabBar",
  "cab-page-header-top-row",
] as const;

export function isFileAllowlisted(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return DS_LOCK_FILE_ALLOWLIST.some((s) => normalized.includes(s));
}

export function isClassAllowlisted(className: string): boolean {
  return DS_LOCK_CLASS_ALLOWLIST.some((t) => className.includes(t));
}

export function hasToolbarShellMarker(className: string): boolean {
  return TOOLBAR_CONTRACT.shellTokens.some((t) => className.includes(t));
}

export function hasFlexContainment(className: string): boolean {
  return FLEX_CONTRACT.containmentMarkers.some((m) => className.includes(m));
}
