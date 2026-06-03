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
  "bunder-editor-modal",
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
